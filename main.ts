/**
 * YouTube Metadata & Stream Extractor
 * Developed by Ramzan Ahsan
 */

const DEVELOPER = "Ramzan Ahsan";

// Use Deno.serve for better compatibility with Deno Deploy
Deno.serve(async (request) => {
  const url = new URL(request.url);
  const youtubeUrl = url.searchParams.get('url');
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Powered-By': DEVELOPER
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Root path info
  if (url.pathname === "/") {
    return new Response(
      JSON.stringify({
        message: "YouTube API is running",
        usage: "/?url=YOUR_YOUTUBE_URL",
        developed_by: DEVELOPER
      }), 
      { headers }
    );
  }

  if (!youtubeUrl) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'YouTube URL parameter is required',
        developed_by: DEVELOPER
      }),
      { status: 400, headers }
    );
  }

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Invalid URL', developed_by: DEVELOPER }),
      { status: 400, headers }
    );
  }

  try {
    const result = await extractYouTubeStreamingData(videoId) || await tryInvidious(videoId);
    if (result) {
      result.developed_by = DEVELOPER;
      return new Response(JSON.stringify(result, null, 2), { headers });
    }
  } catch (err) {
    console.error(err);
  }

  return new Response(
    JSON.stringify({
      status: 'error',
      message: 'Could not extract data directly.',
      links: [`https://ssyoutube.com/watch?v=${videoId}`],
      developed_by: DEVELOPER
    }),
    { headers }
  );
});

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? match[1] : null;
}

async function extractYouTubeStreamingData(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await res.text();
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!match) return null;
    
    const data = JSON.parse(match[1]);
    return {
      title: data.videoDetails?.title,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      videoId
    };
  } catch { return null; }
}

async function tryInvidious(videoId) {
  try {
    const res = await fetch(`https://yewtu.be/api/v1/videos/${videoId}`);
    if (res.ok) return await res.json();
  } catch { return null; }
}
