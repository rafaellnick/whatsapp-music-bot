import fs from 'fs';
import path from 'path';
import BaseDownload from './base';
import YTDownload from './YTDownload';
import { DOWNLOAD_PATH } from '../../config';

const MAX_CACHED_VIDEO_BYTES = Number(process.env.WHATSAPP_MAX_VIDEO_MB || 64) * 1024 * 1024;

export default class Downloader extends BaseDownload {
  private ytDownload: YTDownload;

  private musics: string[];

  constructor() {
    super();
    this.ytDownload = new YTDownload();
    this.musics = this.getCachedMusics();
    console.log(this.musics);
  }

  public async handle(videoId: string): Promise<string> {
    const videoPath = path.join(DOWNLOAD_PATH, `${videoId}.mp4`);

    if (this.isMusicDownloaded(videoId) && this.isVideoUsable(videoPath)) {
      return videoPath;
    }

    if (fs.existsSync(videoPath)) {
      fs.rmSync(videoPath, { force: true });
      this.musics = this.musics.filter(music => music !== `${videoId}.mp4`);
    }

    const result = await this.ytDownload.download(videoId);

    const resultSize = fs.existsSync(result) ? fs.statSync(result).size : 0;

    if (!this.isVideoUsable(result)) {
      fs.rmSync(result, { force: true });
      throw new Error(
        `Downloaded video is too large for WhatsApp (${this.formatBytes(
          resultSize,
        )}). Try the audio command instead.`,
      );
    }

    this.musics = [...this.musics, `${videoId}.mp4`];

    return result;
  }

  private isMusicDownloaded(videoId: string): boolean {
    return this.musics.includes(`${videoId}.mp4`);
  }

  private isVideoUsable(videoPath: string): boolean {
    return fs.existsSync(videoPath) && fs.statSync(videoPath).size <= MAX_CACHED_VIDEO_BYTES;
  }

  private formatBytes(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  protected getCachedMusics(): string[] {
    if (!fs.existsSync(DOWNLOAD_PATH)) {
      fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    }

    return fs.readdirSync(DOWNLOAD_PATH);
  }
}
