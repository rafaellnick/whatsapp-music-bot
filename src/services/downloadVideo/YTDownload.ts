import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
import { DOWNLOAD_PATH } from '../../config';
import { getYtDlpRuntimeArgs, runYtDlp } from '../download/YTDlp';

const execFileAsync = promisify(execFile);
const MAX_VIDEO_BYTES = Number(process.env.WHATSAPP_MAX_VIDEO_MB || 15) * 1024 * 1024;
const TARGET_VIDEO_BYTES = Math.floor(MAX_VIDEO_BYTES * 0.9);

type ExecFileFailure = Error & {
  stderr?: string;
};

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const sourcePath = path.join(DOWNLOAD_PATH, `${videoId}.source.mp4`);
    const videoPath = path.join(DOWNLOAD_PATH, `${videoId}.mp4`);
    fs.rmSync(sourcePath, { force: true });
    fs.rmSync(videoPath, { force: true });

    await runYtDlp([
      '--no-playlist',
      '--force-overwrites',
      '--no-part',
      '--format',
      'worst[ext=mp4][height<=240][vcodec!=none][acodec!=none]/best[ext=mp4][height<=240][vcodec!=none][acodec!=none]/worst[ext=mp4][vcodec!=none][acodec!=none]/18',
      '--output',
      sourcePath,
      ...getYtDlpRuntimeArgs(),
      videoUrl,
    ]);

    if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size === 0) {
      throw new Error(`Could not download video ${videoId}`);
    }

    if (fs.statSync(sourcePath).size <= TARGET_VIDEO_BYTES) {
      fs.renameSync(sourcePath, videoPath);
      return videoPath;
    }

    await this.compressForWhatsApp(sourcePath, videoPath);
    fs.rmSync(sourcePath, { force: true });

    if (!fs.existsSync(videoPath) || fs.statSync(videoPath).size === 0) {
      throw new Error(`Could not compress video ${videoId}`);
    }

    return videoPath;
  }

  private async compressForWhatsApp(sourcePath: string, outputPath: string): Promise<void> {
    if (!ffmpegPath) {
      throw new Error('ffmpeg-static binary was not found');
    }

    const durationSeconds = await this.getDurationSeconds(sourcePath);
    const totalBitrateKbps = Math.max(
      96,
      Math.floor((TARGET_VIDEO_BYTES * 8) / durationSeconds / 1000),
    );
    const audioBitrateKbps = durationSeconds > 600 ? 32 : 48;
    const videoBitrateKbps = Math.max(64, totalBitrateKbps - audioBitrateKbps);

    console.log(
      `Compressing video for WhatsApp media: ${videoBitrateKbps}k video, ${audioBitrateKbps}k audio`,
    );

    await execFileAsync(
      ffmpegPath,
      [
        '-y',
        '-i',
        sourcePath,
        '-vf',
        'scale=-2:240',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-profile:v',
        'baseline',
        '-level',
        '3.0',
        '-pix_fmt',
        'yuv420p',
        '-b:v',
        `${videoBitrateKbps}k`,
        '-maxrate',
        `${videoBitrateKbps}k`,
        '-bufsize',
        `${videoBitrateKbps * 2}k`,
        '-c:a',
        'aac',
        '-b:a',
        `${audioBitrateKbps}k`,
        '-movflags',
        '+faststart',
        outputPath,
      ],
      {
        maxBuffer: 20 * 1024 * 1024,
      },
    );
  }

  private async getDurationSeconds(videoPath: string): Promise<number> {
    if (!ffmpegPath) {
      throw new Error('ffmpeg-static binary was not found');
    }

    try {
      await execFileAsync(ffmpegPath, ['-i', videoPath], {
        maxBuffer: 4 * 1024 * 1024,
      });
    } catch (error) {
      const stderr = (error as ExecFileFailure).stderr || '';
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);

      if (match) {
        const [, hours, minutes, seconds] = match;
        return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
      }
    }

    return 300;
  }
}
