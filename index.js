const path = require('path');
const { spawn } = require('child_process');

const downloaderDir = path.join(__dirname, 'yt-downloader');
const downloaderEntry = path.join(downloaderDir, 'index.js');

const child = spawn(process.execPath, [downloaderEntry, ...process.argv.slice(2)], {
  cwd: downloaderDir,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error(`Failed to start YouTube downloader: ${err.message}`);
  process.exit(1);
});
