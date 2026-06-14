import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
import { DOWNLOAD_PATH } from '../../config';
import { getYtDlpRuntimeArgs, runYtDlp } from './YTDlp';

const execFileAsync = promisify(execFile);

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoPath = path.join(DOWNLOAD_PATH, `${videoId}.audio`);
    fs.rmSync(videoPath, { force: true });

    await runYtDlp([
      '--no-playlist',
      '--force-overwrites',
      '--no-part',
      '--format',
      'bestaudio/best',
      '--output',
      videoPath,
      ...getYtDlpRuntimeArgs(),
      videoUrl,
    ]);

    if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size === 0) {
      throw new Error(`Could not download audio for video ${videoId}`);
    }

    return this.extractMp3FromMp4(videoPath);
  }

  private async extractMp3FromMp4(videoPath: string): Promise<string> {
    const outputPath = path.join(
      path.dirname(videoPath),
      `${path.parse(videoPath).name}.mp3`,
    );

    if (!ffmpegPath) {
      throw new Error('ffmpeg-static binary was not found');
    }

    await execFileAsync(ffmpegPath, [
      '-y',
      '-i',
      videoPath,
      '-vn',
      '-codec:a',
      'libmp3lame',
      '-q:a',
      '2',
      outputPath,
    ]);

    fs.unlinkSync(videoPath);

    return outputPath;
  }
}
