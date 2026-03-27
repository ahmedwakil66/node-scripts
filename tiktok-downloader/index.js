const Tiktok = require('@tobyg74/tiktok-api-dl');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const url = process.argv[2];

if (!url) {
  console.error('Please provide a TikTok URL as the first argument.');
  console.log('Usage: node index.js <tiktok_url>');
  process.exit(1);
}

async function downloadVideo() {
  try {
    console.log(`[TikTok Downloader] Fetching metadata for: ${url}`);
    
    // We try 'v2' (SSSTik) first as it typically provides a high-quality video without watermark
    let result = await Tiktok.Downloader(url, { version: 'v2' });
    
    let videoUrl = null;

    if (result.status === 'success' && result.result?.video?.playAddr) {
        videoUrl = result.result.video.playAddr;
        console.log('[TikTok Downloader] Successfully fetched metadata using v2.');
    } else {
        console.log('[TikTok Downloader] Failed using v2, falling back to v3 (MusicalDown)...');
        result = await Tiktok.Downloader(url, { version: 'v3' });
        if (result.status === 'success' && result.result?.videoHD) {
            videoUrl = result.result.videoHD;
            console.log('[TikTok Downloader] Successfully fetched metadata using v3.');
        } else {
            console.log('[TikTok Downloader] Failed using v3, falling back to v1 (Tiktok API)...');
            result = await Tiktok.Downloader(url, { version: 'v1' });
            if (result.status === 'success' && result.result?.video?.downloadAddr?.[0]) {
                videoUrl = result.result.video.downloadAddr[0];
                console.log('[TikTok Downloader] Successfully fetched metadata using v1.');
            } else if (result.status === 'success' && result.result?.video?.playAddr?.[0]) {
                videoUrl = result.result.video.playAddr[0];
                console.log('[TikTok Downloader] Successfully fetched metadata using v1 playAddr.');
            }
        }
    }

    if (!videoUrl) {
      console.error('[TikTok Downloader] Could not extract video URL. The video might be private, deleted, or there was a rate limit.');
      console.error('Debug response:', JSON.stringify(result, null, 2));
      process.exit(1);
    }

    console.log(`[TikTok Downloader] Found download URL. Starting download...`);
    
    // Create a filename from the video ID or current timestamp if parsing fails
    let videoId = Date.now().toString();
    try {
        const urlObj = new URL(url);
        const match = urlObj.pathname.match(/\/video\/(\d+)/);
        if (match && match[1]) {
            videoId = match[1];
        } else {
            videoId = url.split('?')[0].split('/').pop() || videoId;
        }
    } catch (e) {
        // Ignore URL parsing errors and use timestamp
    }
    
    // Clean up to ensure it is a safe filename
    videoId = videoId.replace(/\W+/g, '');
    const filePath = path.join(__dirname, `tiktok_${videoId}.mp4`);

    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/'
      }
    });

    const writer = fs.createWriteStream(filePath);

    const totalLength = response.headers['content-length'];
    let downloadedBytes = 0;

    response.data.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalLength) {
            const percentage = ((downloadedBytes / totalLength) * 100).toFixed(2);
            process.stdout.write(`\r[TikTok Downloader] Downloading... ${percentage}%`);
        } else {
            const mb = (downloadedBytes / (1024 * 1024)).toFixed(2);
            process.stdout.write(`\r[TikTok Downloader] Downloading... ${mb} MB`);
        }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
          process.stdout.write('\n');
          console.log(`[TikTok Downloader] 🎉 Video successfully downloaded to: ${filePath}`);
          resolve();
      });
      writer.on('error', (err) => {
          process.stdout.write('\n');
          console.error('[TikTok Downloader] ❌ Error writing video to disk:', err);
          reject(err);
      });
    });

  } catch (error) {
    console.error('[TikTok Downloader] ❌ An error occurred:');
    console.error(error.message);
  }
}

downloadVideo();
