import fs from 'fs';
import path from 'path';
import { DOWNLOAD_PATH } from '../../config';
import { getYtDlpRuntimeArgs, runYtDlp } from '../download/YTDlp';

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoPath = path.join(DOWNLOAD_PATH, `${videoId}.mp4`);
    fs.rmSync(videoPath, { force: true });

    await runYtDlp([
      '--no-playlist',
      '--force-overwrites',
      '--no-part',
      '--format',
      'worst[ext=mp4][vcodec!=none][acodec!=none]/18/best[ext=mp4][height<=360][vcodec!=none][acodec!=none]/best[ext=mp4][vcodec!=none][acodec!=none]',
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
