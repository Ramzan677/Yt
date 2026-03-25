/**
 * Ultimate YouTube Bypass API
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
      usage: "?url=YOUTUBE_LINK",
      developed_by: DEVELOPER
    }), { headers });
  }

  const vId = extractVideoId(youtubeUrl);

  try {
    // ENGINE: High-speed specialized extraction
    // This bypasses YouTube blocks by using an external processing node
    const res = await fetch(`https://api.vyt.workers.dev/api/info?url=${encodeURIComponent(youtubeUrl)}`);
    const data = await res.json();

    if (data && data.formats) {
      // Get the highest quality MP4 available
      const bestVideo = data.formats
        .filter(f => f.container === 'mp4' && f.hasVideo && f.hasAudio)
        .sort((a, b) => b.height - a.height)[0];

      return new Response(JSON.stringify({
        status: "success",
        title: data.title,
        duration: data.duration,
        thumbnail: data.thumbnail,
        download_url: bestVideo ? bestVideo.url : data.formats[0].url,
        quality: bestVideo ? `${bestVideo.height}p` : "Auto",
        developed_by: DEVELOPER
      }, null, 2), { headers });
    }
  } catch (err) {
    console.log("Primary extraction failed, trying secondary...");
  }

  // EMERGENCY FALLBACK (If the API above is down)
  return new Response(JSON.stringify({
    status: "fallback",
    message: "Security active. Use the direct link generated below:",
    video_id: vId,
    instant_download: `https://9xbuddy.com/process?url=${encodeURIComponent(youtubeUrl)}`,
    alternative: `https://ssyoutube.com/watch?v=${vId}`,
    developed_by: DEVELOPER
  }, null, 2), { headers });
});

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? match[1] : "unknown";
}
