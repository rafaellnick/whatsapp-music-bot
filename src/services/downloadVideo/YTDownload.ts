import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import { DOWNLOAD_PATH } from '../../config';

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

    const videoPath = `${DOWNLOAD_PATH}/${videoId}.mp4`;
    const audio = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {quality: 140 }).pipe(fs.createWriteStream(videoPath));

    const downloadEnd = await new Promise(resolve => {
      audio.on('finish', () => resolve(true));
      audio.on('error', () => resolve(false));
    });

    if (!downloadEnd) {
      // oh no i can't download this shit 😵️
    }

    return videoPath;
  }
}
