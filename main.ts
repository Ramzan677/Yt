/**
 * Ultimate YouTube Downloader API
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
      message: "YouTube API Active. Usage: ?url=LINK",
      developed_by: DEVELOPER
    }), { headers });
  }

  try {
    // We use a high-reliability extraction service to bypass YouTube IP blocks
    const cobaltResponse = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: youtubeUrl,
        vQuality: "720", // Downloads 720p by default
        filenameStyle: "pretty"
      })
    });

    const data = await cobaltResponse.json();

    if (data.status === "stream" || data.status === "picker" || data.status === "redirect") {
      return new Response(JSON.stringify({
        status: "success",
        videoId: extractVideoId(youtubeUrl),
        download_url: data.url || data.picker?.[0]?.url,
        message: "Link generated successfully",
        developed_by: DEVELOPER
      }, null, 2), { headers });
    }

    throw new Error("Service busy");

  } catch (err) {
    // Fallback if even the high-reliability service fails
    return new Response(JSON.stringify({
      status: "error",
      message: "YouTube security is high. Use these direct tools:",
      direct_tools: [
        `https://ssyoutube.com/watch?v=${extractVideoId(youtubeUrl)}`,
        `https://y2mate.com/youtube/${extractVideoId(youtubeUrl)}`
      ],
      developed_by: DEVELOPER
    }, null, 2), { headers });
  }
});

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? match[1] : "unknown";
}
