/**
 * YouTube Metadata & Stream Extractor
 * Developed by Ramzan Ahsan
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const DEVELOPER = "Ramzan Ahsan";

serve(async (request) => {
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

  if (!youtubeUrl) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'YouTube URL parameter is required',
        example: '?url=https://www.youtube.com/watch?v=VIDEO_ID',
        developed_by: DEVELOPER
      }, null, 2),
      { status: 400, headers }
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
    // Method 1: Direct YouTube streaming data extraction
    const result1 = await extractYouTubeStreamingData(videoId);
    if (result1) return successResponse(result1, headers);

    // Method 2: YouTube player API
    const result2 = await getYouTubePlayerData(videoId);
    if (result2) return successResponse(result2, headers);

    // Method 3: YouTube embed data
    const result3 = await getYouTubeEmbedData(videoId);
    if (result3) return successResponse(result3, headers);

    // Method 4: Invidious Fallback
    const result4 = await tryInvidious(videoId);
    if (result4) return successResponse(result4, headers);

  } catch (err) {
    console.error('Extraction failed:', err.message);
  }

  // Final fallback
  return new Response(
    JSON.stringify({
      status: 'info',
      message: 'Direct streaming not available. Use these tools:',
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
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/,
    /youtube\.com\/embed\/([^&?#]+)/,
    /youtube\.com\/v\/([^&?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function successResponse(data, headers) {
  data.developed_by = DEVELOPER;
  return new Response(JSON.stringify(data, null, 2), { headers });
}

async function extractYouTubeStreamingData(videoId) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
    });

    if (response.ok) {
      const html = await response.text();
      const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (playerResponseMatch) {
        const playerData = JSON.parse(playerResponseMatch[1]);
        return processYouTubePlayerData(playerData, videoId);
      }
    }
  } catch (e) { return null; }
  return null;
}

function processYouTubePlayerData(playerData, videoId) {
  const formats = [];
  const streamingData = playerData.streamingData || {};
  const allFormats = [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])];

  allFormats.forEach(format => {
    let url = format.url;
    if (format.signatureCipher) {
      const cipherParams = new URLSearchParams(format.signatureCipher);
      url = cipherParams.get('url');
    }
    
    if (url) {
      formats.push({
        quality: format.qualityLabel || (format.audioQuality ? 'audio' : 'unknown'),
        url: url,
        type: format.mimeType,
        audio: format.mimeType?.includes('audio')
      });
    }
  });

  if (formats.length > 0) {
    return {
      status: 'success',
      videoId: videoId,
      title: playerData.videoDetails?.title || 'YouTube Video',
      duration: formatDuration(playerData.videoDetails?.lengthSeconds),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      formats: formats
    };
  }
  return null;
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getYouTubePlayerData(videoId) {
  // Similar logic to method 1 but via embed endpoint
  return null; 
}

async function getYouTubeEmbedData(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return { status: 'success', videoId, title: data.title, thumbnail: data.thumbnail_url, source: 'oembed' };
    }
  } catch (e) { return null; }
}

async function tryInvidious(videoId) {
  const instances = ['https://yewtu.be', 'https://invidious.snopyta.org'];
  for (const instance of instances) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        return { status: 'success', videoId, title: data.title, source: 'invidious' };
      }
    } catch (e) { continue; }
  }
  return null;
}
