const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const dir = __dirname;
const files = fs.readdirSync(dir);

const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'];
const audioExts = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac'];

// Find the first video and audio files that don't start with 'merged_'
const videoFile = files.find(file => videoExts.includes(path.extname(file).toLowerCase()) && !file.startsWith('merged_'));
const audioFile = files.find(file => audioExts.includes(path.extname(file).toLowerCase()) && !file.startsWith('merged_'));

if (!videoFile) {
    console.error('❌ Error: No video file found in the directory.');
    process.exit(1);
}

if (!audioFile) {
    console.error('❌ Error: No audio file found in the directory.');
    process.exit(1);
}

const inputVideoPath = path.join(dir, videoFile);
const inputAudioPath = path.join(dir, audioFile);

// Keep the same extension for the output for best compatibility when copying streams
const outputExt = path.extname(videoFile);
const outputFileName = `merged_${path.parse(videoFile).name}${outputExt}`;
const outputPath = path.join(dir, outputFileName);

console.log(`🎬 Video found: ${videoFile}`);
console.log(`🎵 Audio found: ${audioFile}`);
console.log(`⏳ Merging... Output will be saved as: ${outputFileName}\n`);

// Build FFmpeg arguments for stream copying
const args = [
    '-y',                    // Overwrite output files without asking
    '-i', inputVideoPath,    // Input 0: Video
    '-i', inputAudioPath,    // Input 1: Audio
    '-c', 'copy',            // Copy both video and audio streams without re-encoding
    '-map', '0:v:0',         // Take the first video stream from Input 0
    '-map', '1:a:0',         // Take the first audio stream from Input 1
    '-shortest',             // Finish output when the shortest input stream ends
    outputPath
];

const processFfmpeg = spawn(ffmpeg, args, { stdio: 'inherit' });

processFfmpeg.on('close', (code) => {
    if (code === 0) {
        console.log(`\n✅ Successfully merged files into: ${outputFileName}`);
    } else {
        console.error(`\n❌ Error merging files. FFmpeg exited with code ${code}`);
    }
});
