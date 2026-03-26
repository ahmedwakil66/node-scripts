import { Innertube, UniversalCache } from 'youtubei.js';
import fs from 'fs';

async function main() {
  const yt = await Innertube.create();
  try {
    const stream = await yt.download('jNQXAC9IVRw', {
      type: 'video',
      quality: 'best'
    });
    
    const file = fs.createWriteStream('test_video.mp4');
    for await (const chunk of stream) {
      file.write(chunk);
    }
    file.end();
    console.log("Download completed.");
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
