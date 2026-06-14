#!/usr/bin/env node

const { createWriteStream, mkdirSync, renameSync, rmSync } = require('fs');
const { chmod } = require('fs/promises');
const https = require('https');
const path = require('path');
const { pipeline } = require('stream/promises');
const { spawnSync } = require('child_process');

const rootPath = path.resolve(__dirname, '..');
const binDir = process.env.YT_DLP_DIR || path.join(rootPath, 'bin');
const outputName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const outputPath = process.env.YT_DLP_PATH || path.join(binDir, outputName);

function getAssetName() {
  if (process.platform === 'win32') {
    return 'yt-dlp.exe';
  }

  if (process.platform === 'darwin') {
    return 'yt-dlp_macos';
  }

  if (process.platform === 'linux') {
    if (process.arch === 'x64') {
      return 'yt-dlp_linux';
    }

    if (process.arch === 'arm64') {
      return 'yt-dlp_linux_aarch64';
    }

    if (process.arch === 'arm') {
      return 'yt-dlp_linux_armv7l';
    }
  }

  return 'yt-dlp';
}

function request(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        const statusCode = response.statusCode || 0;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          response.headers.location &&
          redirectsLeft > 0
        ) {
          response.resume();
          resolve(request(response.headers.location, redirectsLeft - 1));
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          reject(new Error(`Download failed with HTTP ${statusCode}: ${url}`));
          return;
        }

        resolve(response);
      })
      .on('error', reject);
  });
}

async function main() {
  const assetName = getAssetName();
  const url =
    process.env.YT_DLP_URL ||
    `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`;
  const tempPath = `${outputPath}.download`;

  mkdirSync(path.dirname(outputPath), { recursive: true });
  rmSync(tempPath, { force: true });

  console.log(`Downloading yt-dlp from ${url}`);
  const response = await request(url);
  await pipeline(response, createWriteStream(tempPath));

  if (process.platform !== 'win32') {
    await chmod(tempPath, 0o755);
  }

  rmSync(outputPath, { force: true });
  renameSync(tempPath, outputPath);

  const result = spawnSync(outputPath, ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      `yt-dlp was downloaded but did not run: ${
        result.stderr || result.stdout || result.error?.message || 'unknown error'
      }`,
    );
  }

  console.log(`yt-dlp installed at ${outputPath}`);
  console.log(`yt-dlp version ${result.stdout.trim()}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
