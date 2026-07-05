const Tiktok = require('@tobyg74/tiktok-api-dl');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.tiktok.com/'
};

function firstValue(value) {
  if (Array.isArray(value)) {
    return value.find(Boolean) || null;
  }

  return value || null;
}

function getTikTokId(url) {
  let mediaId = Date.now().toString();

  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/(?:video|photo)\/(\d+)/);
    if (match && match[1]) {
      mediaId = match[1];
    } else {
      mediaId = url.split('?')[0].split('/').pop() || mediaId;
    }
  } catch (e) {
    // Ignore URL parsing errors and use timestamp.
  }

  return mediaId.replace(/\W+/g, '');
}

function getExtensionFromContentType(contentType, fallbackExtension) {
  if (!contentType) {
    return fallbackExtension;
  }

  const normalizedType = contentType.split(';')[0].trim().toLowerCase();
  const extensionsByType = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4'
  };

  return extensionsByType[normalizedType] || fallbackExtension;
}

async function downloadUrl(mediaUrl, filePath, mediaLabel) {
  console.log(`[TikTok Downloader] Starting ${mediaLabel} download...`);

  const response = await axios({
    method: 'GET',
    url: mediaUrl,
    responseType: 'stream',
    headers: REQUEST_HEADERS
  });

  const parsedPath = path.parse(filePath);
  const finalFilePath = path.join(
    parsedPath.dir,
    `${parsedPath.name}${getExtensionFromContentType(response.headers['content-type'], parsedPath.ext)}`
  );
  const writer = fs.createWriteStream(finalFilePath);

  const totalLength = response.headers['content-length'];
  let downloadedBytes = 0;

  response.data.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    if (totalLength) {
      const percentage = ((downloadedBytes / totalLength) * 100).toFixed(2);
      process.stdout.write(`\r[TikTok Downloader] Downloading ${mediaLabel}... ${percentage}%`);
    } else {
      const mb = (downloadedBytes / (1024 * 1024)).toFixed(2);
      process.stdout.write(`\r[TikTok Downloader] Downloading ${mediaLabel}... ${mb} MB`);
    }
  });

  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on('finish', () => {
      process.stdout.write('\n');
      console.log(`[TikTok Downloader] ${mediaLabel} successfully downloaded to: ${finalFilePath}`);
      resolve();
    });
    writer.on('error', (err) => {
      process.stdout.write('\n');
      console.error(`[TikTok Downloader] Error writing ${mediaLabel} to disk:`, err);
      reject(err);
    });
    response.data.on('error', reject);
  });
}

function getMediaFromResult(result) {
  if (result.status !== 'success' || !result.result) {
    return null;
  }

  const mediaResult = result.result;

  if (mediaResult.type === 'image' && Array.isArray(mediaResult.images) && mediaResult.images.length > 0) {
    return {
      type: 'image',
      urls: mediaResult.images.filter(Boolean)
    };
  }

  const videoUrl =
    firstValue(mediaResult.video?.downloadAddr) ||
    firstValue(mediaResult.video?.playAddr) ||
    firstValue(mediaResult.videoHD) ||
    firstValue(mediaResult.videoSD) ||
    firstValue(mediaResult.videoWatermark);

  if (videoUrl) {
    return {
      type: 'video',
      urls: [videoUrl]
    };
  }

  return null;
}

async function downloadVideo(url) {
  try {
    console.log(`[TikTok Downloader] Fetching metadata for: ${url}`);
    
    // We try 'v2' (SSSTik) first as it typically provides a high-quality video without watermark
    let result = await Tiktok.Downloader(url, { version: 'v2' });
    
    let media = getMediaFromResult(result);

    if (media) {
        console.log('[TikTok Downloader] Successfully fetched metadata using v2.');
    } else {
        console.log('[TikTok Downloader] Failed using v2, falling back to v3 (MusicalDown)...');
        result = await Tiktok.Downloader(url, { version: 'v3' });
        media = getMediaFromResult(result);
        if (media) {
            console.log('[TikTok Downloader] Successfully fetched metadata using v3.');
        } else {
            console.log('[TikTok Downloader] Failed using v3, falling back to v1 (Tiktok API)...');
            result = await Tiktok.Downloader(url, { version: 'v1' });
            media = getMediaFromResult(result);
            if (media) {
                console.log('[TikTok Downloader] Successfully fetched metadata using v1.');
            }
        }
    }

    if (!media || media.urls.length === 0) {
      console.error('[TikTok Downloader] Could not extract media URL. The post might be private, deleted, or there was a rate limit.');
      console.error('Debug response:', JSON.stringify(result, null, 2));
      return false;
    }

    const mediaId = getTikTokId(url);
    console.log(`[TikTok Downloader] Found ${media.type === 'image' ? media.urls.length : 1} ${media.type}${media.urls.length === 1 ? '' : 's'}.`);

    for (let index = 0; index < media.urls.length; index += 1) {
      const isImage = media.type === 'image';
      const paddedIndex = String(index + 1).padStart(2, '0');
      const fileName = isImage
        ? `tiktok_${mediaId}_${paddedIndex}.jpg`
        : `tiktok_${mediaId}.mp4`;
      const mediaLabel = isImage
        ? `image ${index + 1}/${media.urls.length}`
        : 'video';

      await downloadUrl(media.urls[index], path.join(__dirname, fileName), mediaLabel);
    }

    return true;

  } catch (error) {
    console.error('[TikTok Downloader] An error occurred:');
    console.error(error.message);
    return false;
  }
}

if (require.main === module) {
  const url = process.argv[2];

  if (!url) {
    console.error('Please provide a TikTok URL as the first argument.');
    console.log('Usage: node index.js <tiktok_url>');
    process.exit(1);
  }

  downloadVideo(url).then((succeeded) => {
    if (!succeeded) {
      process.exit(1);
    }
  });
}

module.exports = {
  downloadVideo,
};
