/**
 * Advanced YouTube Downloader API for Deno
 * Developed by Ramzan Ahsan
 */

const DEVELOPER = "Ramzan Ahsan";

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const youtubeUrl = url.searchParams.get('url');
  
  // CORS headers
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

  // Root instructions
  if (!youtubeUrl) {
    return new Response(
      JSON.stringify({
        status: 'online',
        message: 'YouTube API is running. Usage: ?url=YOUTUBE_LINK',
        developed_by: DEVELOPER
      }, null, 2),
      { status: 200, headers }
    );
  }

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Invalid YouTube URL',
        developed_by: DEVELOPER
      }, null, 2),
      { status: 400, headers }
    );
  }

  try {
    // We attempt extraction using multiple methods
    let result = await extractYouTubeStreamingData(videoId);
    
    // Fallback to Invidious if direct fails
    if (!result || !result.formats || result.formats.length === 0) {
      result = await tryInvidious(videoId);
    }

    if (result) {
      result.developed_by = DEVELOPER;
      return new Response(JSON.stringify(result, null, 2), { headers });
    }

  } catch (err) {
    console.log('Error:', err.message);
  }

  // Final fallback if all logic fails
  return new Response(
    JSON.stringify({
      status: 'info',
      message: 'Direct extraction restricted by YouTube. Use these links:',
      videoId: videoId,
      direct_tools: [
        `https://ssyoutube.com/watch?v=${videoId}`,
        `https://y2mate.com/youtube/${videoId}`
      ],
      developed_by: DEVELOPER
    }, null, 2),
    { headers }
  );
});

function extractVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? match[1] : null;
}

async function extractYouTubeStreamingData(videoId) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}&has_verified=1&bpctr=9999999999`;
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (response.ok) {
      const html = await response.text();
      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      
      if (playerMatch) {
        const playerData = JSON.parse(playerMatch[1]);
        const streamingData = playerData.streamingData || {};
        const formats = [];
        const allStreams = [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])];

        allStreams.forEach(format => {
          let streamUrl = format.url;
          if (!streamUrl && format.signatureCipher) {
            const cipher = new URLSearchParams(format.signatureCipher);
            streamUrl = cipher.get('url');
          }
          if (streamUrl) {
            formats.push({
              quality: format.qualityLabel || (format.audioQuality ? 'Audio' : 'SD'),
              type: format.mimeType.split(';')[0],
              url: streamUrl
            });
          }
        });

        if (formats.length > 0) {
          return {
            status: 'success',
            videoId,
            title: playerData.videoDetails?.title,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            formats: formats
          };
        }
      }
    }
  } catch { return null; }
  return null;
}

async function tryInvidious(videoId) {
  const instances = ['https://yewtu.be', 'https://invidious.snopyta.org', 'https://invidiou.site'];
  for (const instance of instances) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        const formats = (data.formatStreams || []).map(f => ({
          quality: f.quality,
          type: f.type,
          url: f.url
        }));
        return { 
          status: 'success', 
          videoId, 
          title: data.title, 
          formats,
          source: 'invidious'
        };
      }
    } catch { continue; }
  }
  return null;
}
