import ytdl from '@distube/ytdl-core';
import { execFile } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
import { DOWNLOAD_PATH } from '../../config';

const execFileAsync = promisify(execFile);

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

    const videoPath = `${DOWNLOAD_PATH}/${videoId}.audio`;
    const audio = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      filter: 'audioonly',
      quality: 'highestaudio',
    }).pipe(fs.createWriteStream(videoPath));

    const downloadEnd = await new Promise(resolve => {
      audio.on('finish', () => resolve(true));
      audio.on('error', () => resolve(false));
    });

    if (!downloadEnd) {
      throw new Error(`Could not download audio for video ${videoId}`);
    }

    return this.extractMp3FromMp4(videoPath);
  }

  private async extractMp3FromMp4(videoPath: string): Promise<string> {
    const audioPath = videoPath.split('.')[0];
    const outputPath = `${audioPath}.mp3`;

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
