/**
 * Pro YouTube Multi-Engine API
 * Developed by Ramzan Ahsan
 */

const DEVELOPER = "Ramzan Ahsan";

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const youtubeUrl = url.searchParams.get('url');
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers });

  if (!youtubeUrl) {
    return new Response(JSON.stringify({
      status: "online",
      message: "API Ready. Usage: ?url=LINK",
      developed_by: DEVELOPER
    }), { headers });
  }

  const vId = extractVideoId(youtubeUrl);

  // --- ENGINE 1: COBALT (Try first for direct MP4) ---
  try {
    const cobalt = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ url: youtubeUrl, vQuality: "720" })
    });
    const cData = await cobalt.json();
    if (cData.url) {
      return new Response(JSON.stringify({
        status: "success",
        engine: "Cobalt-Premium",
        title: "Video Found",
        download: cData.url,
        developed_by: DEVELOPER
      }, null, 2), { headers });
    }
  } catch (e) { console.log("Engine 1 busy"); }

  // --- ENGINE 2: INVIDIOUS (Fallback for metadata + links) ---
  try {
    const invidious = await fetch(`https://yewtu.be/api/v1/videos/${vId}`);
    if (invidious.ok) {
      const iData = await invidious.json();
      return new Response(JSON.stringify({
        status: "success",
        engine: "Invidious-Core",
        title: iData.title,
        thumbnail: iData.videoThumbnails?.[0]?.url,
        formats: iData.formatStreams?.map(f => ({ quality: f.qualityLabel, link: f.url })),
        developed_by: DEVELOPER
      }, null, 2), { headers });
    }
  } catch (e) { console.log("Engine 2 busy"); }

  // --- ENGINE 3: THE "NEVER FAIL" REDIRECT ---
  return new Response(JSON.stringify({
    status: "redirect",
    message: "Direct API servers are busy. Click the link below to download instantly.",
    video_info: {
      id: vId,
      thumbnail: `https://i.ytimg.com/vi/${vId}/maxresdefault.jpg`
    },
    instant_download: `https://ssyoutube.com/watch?v=${vId}`,
    alternative: `https://y2mate.com/youtube/${vId}`,
    developed_by: DEVELOPER
  }, null, 2), { headers });
});

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? match[1] : "unknown";
}
