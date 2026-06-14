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
const SOURCE_FILE_MARKER = '.source.';

type ExecFileFailure = Error & {
  stderr?: string;
  stdout?: string;
};

export default class YTDownload {
  public async download(videoId: string): Promise<string> {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const sourceTemplate = path.join(DOWNLOAD_PATH, `${videoId}${SOURCE_FILE_MARKER}%(ext)s`);
    const videoPath = path.join(DOWNLOAD_PATH, `${videoId}.mp4`);
    this.removeSourceFiles(videoId);
    fs.rmSync(videoPath, { force: true });

    await runYtDlp([
      '--no-playlist',
      '--force-overwrites',
      '--no-part',
      '--format',
      'worst[ext=mp4][height<=240][vcodec!=none][acodec!=none]/best[ext=mp4][height<=240][vcodec!=none][acodec!=none]/worst[ext=mp4][vcodec!=none][acodec!=none]/18',
      '--output',
      sourceTemplate,
      ...getYtDlpRuntimeArgs(),
      videoUrl,
    ]);

    const sourcePath = this.findSourceFile(videoId);

    if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size === 0) {
      throw new Error(`Could not download video ${videoId}`);
    }

    if (fs.statSync(sourcePath).size <= TARGET_VIDEO_BYTES) {
      fs.renameSync(sourcePath, videoPath);
      return videoPath;
    }

    try {
      await this.compressForWhatsApp(sourcePath, videoPath);
    } finally {
      fs.rmSync(sourcePath, { force: true });
    }

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

    await this.runFfmpeg([
      '-y',
      '-i',
      sourcePath,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-sn',
      '-dn',
      '-vf',
      'scale=-2:240',
      '-r',
      '24',
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
      '-c:a',
      'aac',
      '-b:a',
      `${audioBitrateKbps}k`,
      '-ac',
      '1',
      '-movflags',
      '+faststart',
      outputPath,
    ]);

    if (fs.statSync(outputPath).size > MAX_VIDEO_BYTES) {
      console.log('Compressed video is still too large. Running a smaller fallback encode.');

      await this.runFfmpeg([
        '-y',
        '-i',
        sourcePath,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-sn',
        '-dn',
        '-vf',
        'scale=-2:180',
        '-r',
        '18',
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
        '96k',
        '-c:a',
        'aac',
        '-b:a',
        '24k',
        '-ac',
        '1',
        '-movflags',
        '+faststart',
        outputPath,
      ]);
    }
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

  private findSourceFile(videoId: string): string {
    const sourceFile = fs
      .readdirSync(DOWNLOAD_PATH)
      .find(file => file.startsWith(`${videoId}${SOURCE_FILE_MARKER}`));

    if (!sourceFile) {
      throw new Error(`Could not find downloaded source video for ${videoId}`);
    }

    return path.join(DOWNLOAD_PATH, sourceFile);
  }

  private removeSourceFiles(videoId: string): void {
    if (!fs.existsSync(DOWNLOAD_PATH)) return;

    for (const file of fs.readdirSync(DOWNLOAD_PATH)) {
      if (file.startsWith(`${videoId}${SOURCE_FILE_MARKER}`)) {
        fs.rmSync(path.join(DOWNLOAD_PATH, file), { force: true });
      }
    }
  }

  private async runFfmpeg(args: string[]): Promise<void> {
    if (!ffmpegPath) {
      throw new Error('ffmpeg-static binary was not found');
    }

    try {
      await execFileAsync(ffmpegPath, args, {
        maxBuffer: 50 * 1024 * 1024,
      });
    } catch (error) {
      const failure = error as ExecFileFailure;
      const details = [failure.stderr, failure.stdout, failure.message]
        .filter(Boolean)
        .join('\n')
        .trim();

      throw new Error(`ffmpeg failed while compressing video:\n${details}`);
    }
  }
}
