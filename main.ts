/**
 * Ironclad YouTube Downloader API
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
    // ENGINE: Optimized 2026 YouTube Extractor
    // This uses a rotating proxy network to bypass IP bans
    const apiRes = await fetch(`https://api.vyt.workers.dev/api/info?url=${encodeURIComponent(youtubeUrl)}`);
    const data = await apiRes.json();

    if (data && data.formats) {
      // Filter for the best MP4 (Video + Audio combined)
      const downloadFormats = data.formats
        .filter(f => f.hasVideo && f.hasAudio)
        .map(f => ({
          quality: f.qualityLabel || `${f.height}p`,
          extension: f.container,
          size: f.filesize ? (f.filesize / (1024 * 1024)).toFixed(2) + " MB" : "Unknown",
          url: f.url
        }));

      return new Response(JSON.stringify({
        status: "success",
        videoId: vId,
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
        downloads: downloadFormats,
        developed_by: DEVELOPER
      }, null, 2), { headers });
    }
    
    throw new Error("Empty formats");

  } catch (err) {
    // If the primary engine is throttled, we use the Direct Fallback
    return new Response(JSON.stringify({
      status: "direct_ready",
      message: "API servers are under heavy load. Use this direct generator:",
      video_id: vId,
      instant_download: `https://en.savefrom.net/1-youtube-video-downloader-360/watch?v=${vId}`,
      alternative_tool: `https://9xbuddy.com/process?url=${encodeURIComponent(youtubeUrl)}`,
      developed_by: DEVELOPER
    }, null, 2), { headers });
  }
});

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? match[1] : "unknown";
}
