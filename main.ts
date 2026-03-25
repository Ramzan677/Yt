/**
 * YouTube Metadata & Stream Extractor
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

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Send a valid URL: ?url=LINK', developed_by: DEVELOPER }),
      { status: 400, headers }
    );
  }

  try {
    // We use a Mobile User-Agent to get a simpler version of the YouTube page
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&bpctr=9999999999&has_verified=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = await res.text();
    
    // Improved extraction regex
    const jsonStr = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)?.[1] 
                 || html.match(/var ytInitialPlayerResponse = ({.+?});/)?.[1];

    if (!jsonStr) throw new Error("Could not find player data");

    const data = JSON.parse(jsonStr);
    const streamingData = data.streamingData || {};
    const formats = [];

    // Process both format types
    const allStreams = [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])];

    allStreams.forEach(stream => {
      let downloadUrl = stream.url;
      
      // Handle ciphered signatures if necessary
      if (!downloadUrl && stream.signatureCipher) {
        const s = new URLSearchParams(stream.signatureCipher);
        downloadUrl = s.get('url');
      }

      if (downloadUrl) {
        formats.push({
          quality: stream.qualityLabel || (stream.audioQuality ? "AUDIO" : "SD"),
          type: stream.mimeType.split(';')[0],
          url: downloadUrl
        });
      }
    });

    return new Response(JSON.stringify({
      status: 'success',
      videoId: videoId,
      title: data.videoDetails?.title || "Video Title Found",
      author: data.videoDetails?.author || "YouTube Creator",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      downloads: formats,
      developed_by: DEVELOPER
    }, null, 2), { headers });

  } catch (err) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'YouTube blocked the request. Try again in a moment.',
      developed_by: DEVELOPER
    }), { headers });
  }
});

function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? match[1] : null;
}
