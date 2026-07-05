const fs = require('fs');
const path = require('path');
const { downloadVideo } = require('./index');

const linksFilePath = path.join(__dirname, 'links.txt');
const minDelayBetweenDownloadsMs = 1000;
const maxDelayBetweenDownloadsMs = 5000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomDelayMs() {
  const range = maxDelayBetweenDownloadsMs - minDelayBetweenDownloadsMs + 1;
  return Math.floor(Math.random() * range) + minDelayBetweenDownloadsMs;
}

function readLinks() {
  if (!fs.existsSync(linksFilePath)) {
    throw new Error(`Could not find ${linksFilePath}`);
  }

  const contents = fs.readFileSync(linksFilePath, 'utf8');
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function main() {
  const links = readLinks();

  if (links.length === 0) {
    console.log('[TikTok Downloader] No links found in links.txt.');
    return;
  }

  const failedLinks = [];

  console.log(`[TikTok Downloader] Found ${links.length} link(s). Downloading sequentially...`);

  for (let index = 0; index < links.length; index += 1) {
    const link = links[index];
    console.log(`\n[TikTok Downloader] Processing ${index + 1}/${links.length}`);

    const succeeded = await downloadVideo(link);

    if (!succeeded) {
      failedLinks.push(link);
      console.log('[TikTok Downloader] Marked as failed. It will remain in links.txt.');
    }

    if (index < links.length - 1) {
      const delayMs = getRandomDelayMs();
      console.log(`[TikTok Downloader] Waiting ${(delayMs / 1000).toFixed(1)}s before the next link...`);
      await sleep(delayMs);
    }
  }

  const nextContents = failedLinks.length > 0 ? `${failedLinks.join('\n')}\n` : '';
  fs.writeFileSync(linksFilePath, nextContents, 'utf8');

  console.log('\n[TikTok Downloader] Finished.');
  console.log(`[TikTok Downloader] Successful: ${links.length - failedLinks.length}`);
  console.log(`[TikTok Downloader] Failed: ${failedLinks.length}`);
  console.log('[TikTok Downloader] links.txt now contains only failed links.');
}

main().catch((error) => {
  console.error('[TikTok Downloader] Fatal error:');
  console.error(error.message);
  process.exit(1);
});
