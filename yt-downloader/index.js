import fs from 'fs';
import path from 'path';
import { select } from '@inquirer/prompts';
import youtubedl from 'youtube-dl-exec';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Import the user's previously created merge.js script from its directory
const mergeFiles = require('../add-audio-to-video/merge.js');
const ytDlpOptions = { jsRuntimes: 'node' };

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Please provide a YouTube URL.");
    console.error("Usage: npm start <youtube_url>");
    process.exit(1);
  }

  console.log("\u23f3 Fetching video information (this can take a moment)...");

  let info;
  try {
    info = await youtubedl(url, {
      ...ytDlpOptions,
      dumpJson: true,
      noWarnings: true,
    });
  } catch (err) {
    console.error("\u274c Error fetching video information:", err.message || err);
    process.exit(1);
  }

  const safeTitle = info.title.replace(/[\\/:*?"<>|]/g, '').trim();
  console.log(`\n\ud83d\udcfa Title: ${info.title}\n`);

  // Gather video formats (vcodec !== 'none')
  const videoFormats = info.formats
    .filter(f => f.vcodec !== 'none' && f.vcodec !== null)
    .sort((a, b) => (b.width || 0) - (a.width || 0));

  if (videoFormats.length === 0) {
    console.error("No video formats found.");
    process.exit(1);
  }

  const choices = [];
  const seenTokens = new Set();
  
  for (const format of videoFormats) {
    // resolution might be raw string or widthxheight
    const resolution = format.resolution || `${format.width}x${format.height}`;
    const ext = format.ext;
    const hasAudio = format.acodec !== 'none' && format.acodec !== null;
    const audioInfo = hasAudio ? '(Has Audio)' : '(No Audio)';
    const fpsInfo = format.fps ? `[${format.fps}fps]` : '';
    
    // Create a deduplication token so we don't bombard user with identical resolution variants
    const token = `${resolution}-${ext}-${audioInfo}-${format.fps}`;
    
    if (!seenTokens.has(token)) {
      seenTokens.add(token);
      choices.push({
        name: `${resolution.padEnd(10, ' ')} | ${ext.padEnd(4, ' ')} | ${audioInfo.padEnd(11, ' ')} ${fpsInfo}`,
        value: format
      });
    }
  }

  // Display the interactive prompt
  const selectedFormat = await select({
    message: 'Select the desired video quality:',
    choices: choices,
    pageSize: 15
  });

  const videoFileName = `${safeTitle}.${selectedFormat.ext}`;

  console.log(`\n\u23f3 Downloading video track...`);
  try {
    // We launch yt-dlp as a child process and pipe output so the user sees progress!
    const videoProcess = youtubedl.exec(url, {
      ...ytDlpOptions,
      format: selectedFormat.format_id,
      output: videoFileName
    });

    videoProcess.stdout.pipe(process.stdout);
    videoProcess.stderr.pipe(process.stderr);

    await new Promise((resolve, reject) => {
      videoProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp exited with code ${code}`));
      });
    });

    console.log(`\n\u2705 Successfully saved video to: ${videoFileName}`);
  } catch (e) {
    console.error("\u274c Error downloading video:", e.message || e);
    process.exit(1);
  }

  // Check if we need to download the audio separately and merge it
  const selectedHasAudio = selectedFormat.acodec !== 'none' && selectedFormat.acodec !== null;
  
  if (!selectedHasAudio) {
    console.log(`\n\u26a0\ufe0f The selected high-quality video track does not contain audio.`);
    console.log(`\u23f3 Fetching the highest quality separate audio track...`);
    
    const audioExt = 'm4a';
    const audioFileName = `${safeTitle}-audio.${audioExt}`;

    try {
      const audioProcess = youtubedl.exec(url, {
        ...ytDlpOptions,
        format: 'bestaudio[ext=m4a]/bestaudio', // Prefer m4a for easiest merging with mp4
        output: audioFileName
      });

      audioProcess.stdout.pipe(process.stdout);
      audioProcess.stderr.pipe(process.stderr);

      await new Promise((resolve, reject) => {
        audioProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`yt-dlp exited with code ${code}`));
        });
      });

      console.log(`\n\u2705 Successfully saved separate audio track!`);
      console.log(`\n\u23f3 Auto-merging the video and audio using your 'merge.js' script...`);

      const absVideoPath = path.resolve(videoFileName);
      const absAudioPath = path.resolve(audioFileName);
      const finalMergedOutputPath = path.resolve(videoFileName); // Overwrite original video or use a new name

      // Execute mergeFiles imported from add-audio-to-video directory
      await mergeFiles(absVideoPath, absAudioPath, path.resolve(`merged_${videoFileName}`));

      console.log(`\n\ud83d\uddd1\ufe0f Cleaning up intermediate files...`);
      fs.unlinkSync(absVideoPath);
      fs.unlinkSync(absAudioPath);
      
      // Rename merged_ back to original name
      fs.renameSync(path.resolve(`merged_${videoFileName}`), absVideoPath);

      console.log(`\u2705 Done! Final video saved with audio integrated at: ${videoFileName}`);
      
    } catch (e) {
      console.error("\u274c Error during audio extraction or merging:", e.message || e);
    }
  }
}

main().catch(console.error);
