/**
 * Ultimate YouTube Downloader (2026 Resilient Edition)
 * Developed by Ramzan Ahsan
 */

const DEVELOPER = "Ramzan Ahsan";
const SUPADATA_API_KEY = "YOUR_FREE_API_KEY"; // Get one at supadata.ai

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

  try {
    // 2026 Best Practice: Using a dedicated Metadata & Info API
    // This bypasses 403 blocks by using their residential proxy network
    const apiRes = await fetch(`https://api.supadata.ai/v1/metadata?url=${encodeURIComponent(youtubeUrl)}`, {
      headers: { 'x-api-key': SUPADATA_API_KEY }
    });
    
    const data = await apiRes.json();

    if (data && data.metadata) {
      return new Response(JSON.stringify({
        status: "success",
        title: data.metadata.title,
        thumbnail: data.metadata.thumbnail,
        // Fallback to direct download tools if the API doesn't provide a direct MP4 link
        download_options: [
          { quality: "High", url: `https://ssyoutube.com/watch?v=${data.metadata.id}` },
          { quality: "Alternative", url: `https://9xbuddy.com/process?url=${encodeURIComponent(youtubeUrl)}` }
        ],
        developed_by: DEVELOPER
      }, null, 2), { headers });
    }
    
    throw new Error("API Blocked");

  } catch (err) {
    return new Response(JSON.stringify({
      status: "error",
      message: "Direct extraction blocked. Use the fallback links.",
      instant_download: `https://en.savefrom.net/1-youtube-video-downloader-360/watch?v=${extractVideoId(youtubeUrl)}`,
      developed_by: DEVELOPER
    }, null, 2), { headers });
  }
});

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? match[1] : "unknown";
}
