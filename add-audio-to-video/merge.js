const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');

function mergeFiles(customVideoPath = null, customAudioPath = null, customOutputPath = null) {
    return new Promise((resolve, reject) => {
        const dir = __dirname;
        
        let inputVideoPath = customVideoPath;
        let inputAudioPath = customAudioPath;
        let outputPath = customOutputPath;
        let videoFile, audioFile;

        if (!inputVideoPath || !inputAudioPath) {
            const files = fs.readdirSync(dir);
            const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'];
            const audioExts = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac'];

            videoFile = files.find(file => videoExts.includes(path.extname(file).toLowerCase()) && !file.startsWith('merged_'));
            audioFile = files.find(file => audioExts.includes(path.extname(file).toLowerCase()) && !file.startsWith('merged_'));

            if (!videoFile) return reject(new Error('❌ Error: No video file found in the directory.'));
            if (!audioFile) return reject(new Error('❌ Error: No audio file found in the directory.'));

            inputVideoPath = path.join(dir, videoFile);
            inputAudioPath = path.join(dir, audioFile);
        } else {
            videoFile = path.basename(inputVideoPath);
            audioFile = path.basename(inputAudioPath);
        }

        if (!outputPath) {
            const outputExt = path.extname(videoFile);
            const outputFileName = `merged_${path.parse(videoFile).name}${outputExt}`;
            outputPath = path.join(dir, outputFileName);
        }

        const finalOutputName = path.basename(outputPath);

        console.log(`🎬 Video path: ${inputVideoPath}`);
        console.log(`🎵 Audio path: ${inputAudioPath}`);
        console.log(`⏳ Merging... Output will be saved as: ${finalOutputName}\n`);

        const args = [
            '-y',
            '-i', inputVideoPath,
            '-i', inputAudioPath,
            '-c', 'copy',
            '-map', '0:v:0?',
            '-map', '1:a:0?',
            '-shortest',
            outputPath
        ];

        const processFfmpeg = spawn(ffmpeg, args, { stdio: 'inherit' });

        processFfmpeg.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ Successfully merged files into: ${finalOutputName}`);
                resolve(outputPath);
            } else {
                reject(new Error(`\n❌ Error merging files. FFmpeg exited with code ${code}`));
            }
        });
    });
}

// Preserve original CLI functionality
if (require.main === module) {
    mergeFiles().catch(err => {
        console.error(err.message || err);
        process.exit(1);
    });
}

module.exports = mergeFiles;
