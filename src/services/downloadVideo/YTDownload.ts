import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import { DOWNLOAD_PATH } from '../../config';

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

    const videoPath = `${DOWNLOAD_PATH}/${videoId}.mp4`;
    const video = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      filter: 'audioandvideo',
      quality: 'highest',
    }).pipe(fs.createWriteStream(videoPath));

    const downloadEnd = await new Promise(resolve => {
      video.on('finish', () => resolve(true));
      video.on('error', () => resolve(false));
    });

    if (!downloadEnd) {
      throw new Error(`Could not download video ${videoId}`);
    }

    return videoPath;
  }
}
