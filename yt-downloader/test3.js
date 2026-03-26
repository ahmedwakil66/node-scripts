import ytdl from '@distube/ytdl-core';
import fs from 'fs';

async function main() {
  try {
    const info = await ytdl.getInfo('jNQXAC9IVRw');
    console.log("Formats available:", info.formats.length);
    ytdl('jNQXAC9IVRw').pipe(fs.createWriteStream('test3.mp4'));
    console.log("Downloading test3.mp4...");
  } catch (err) {
    console.error("YTDL Error:", err);
  }
}
main();
