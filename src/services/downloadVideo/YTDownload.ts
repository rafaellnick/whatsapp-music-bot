import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';
import { DOWNLOAD_PATH } from '../../config';
import { getYtDlpRuntimeArgs, runYtDlp } from '../download/YTDlp';

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

    if (!ffmpegPath) {
      throw new Error('ffmpeg-static binary was not found');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoPath = path.join(DOWNLOAD_PATH, `${videoId}.mp4`);
    fs.rmSync(videoPath, { force: true });

    await runYtDlp([
      '--no-playlist',
      '--force-overwrites',
      '--no-part',
      '--format',
      'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format',
      'mp4',
      '--ffmpeg-location',
      ffmpegPath,
      '--output',
      videoPath,
      ...getYtDlpRuntimeArgs(),
      videoUrl,
    ]);

    if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size === 0) {
      throw new Error(`Could not download video ${videoId}`);
    }

    return videoPath;
  }
}
