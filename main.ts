/**
 * Advanced YouTube Downloader API
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
    'X-Powered-By': DEVELOPER
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers });

  // Root path instructions
  if (url.pathname === "/" && !youtubeUrl) {
    return new Response(
      JSON.stringify({
        status: "online",
        message: "YouTube Downloader API is active",
        usage: `${url.origin}/?url=YOUTUBE_LINK`,
        developed_by: DEVELOPER
      }, null, 2), 
      { headers }
    );
  }

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Invalid YouTube URL provided.', developed_by: DEVELOPER }),
      { status: 400, headers }
    );
  }

  try {
    const data = await getFullYoutubeData(videoId);
    if (data) {
      data.developed_by = DEVELOPER;
      return new Response(JSON.stringify(data, null, 2), { headers });
    }
  } catch (err) {
    console.error("Extraction error:", err);
  }

  // Final fallback with direct download tool suggestions
  return new Response(
    JSON.stringify({
      status: 'error',
      message: 'Direct extraction failed. Use these tools:',
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

async function getFullYoutubeData(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await res.text();
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!match) return null;

    const data = JSON.parse(match[1]);
    const streamingData = data.streamingData || {};
    const formats = [];

    // Combine both fixed and adaptive formats for 1080p, 720p, etc.
    const allStreams = [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])];

    allStreams.forEach(stream => {
      let url = stream.url;
      if (!url && stream.signatureCipher) {
        const params = new URLSearchParams(stream.signatureCipher);
        url = params.get('url');
      }

      if (url) {
        formats.push({
          quality: stream.qualityLabel || (stream.audioQuality ? 'AUDIO' : '360p'),
          type: stream.mimeType.split(';')[0],
          download_url: url,
          size: formatBytes(stream.contentLength),
          fps: stream.fps || null
        });
      }
    });

    return {
      status: 'success',
      videoId: videoId,
      title: data.videoDetails?.title || "Unknown Title",
      author: data.videoDetails?.author || "Unknown Channel",
      duration: formatTime(data.videoDetails?.lengthSeconds),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      downloads: formats
    };
  } catch { return null; }
}

function formatBytes(bytes) {
  if (!bytes) return "Unknown Size";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
}

function formatTime(seconds) {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
