import fs from 'fs';
import path from 'path';
import { MessageMedia } from 'whatsapp-web.js';

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

const DEFAULT_MAX_MEDIA_MB: Record<string, number> = {
  '.mp3': Number(process.env.WHATSAPP_MAX_AUDIO_MB || 20),
  '.mp4': Number(process.env.WHATSAPP_MAX_VIDEO_MB || 64),
};

export default function createLocalMedia(filePath: string): MessageMedia {
  const buffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mimetype = MIME_TYPES[extension] || 'application/octet-stream';
  const filename = path.basename(filePath);
  const data = buffer.toString('base64').replace(/[^A-Za-z0-9+/=]/g, '');
  const maxMediaBytes =
    (DEFAULT_MAX_MEDIA_MB[extension] || Number(process.env.WHATSAPP_MAX_MEDIA_MB || 20)) *
    1024 *
    1024;

  if (buffer.length > maxMediaBytes) {
    throw new Error(
      `Media file ${filename} is too large for WhatsApp: ${(
        buffer.length /
        1024 /
        1024
      ).toFixed(1)} MB. Limit is ${(maxMediaBytes / 1024 / 1024).toFixed(0)} MB`,
    );
  }

  if (!data || data.length % 4 !== 0) {
    throw new Error(`Could not encode media file ${filename} as valid base64`);
  }

  console.log(
    `Sending media: ${filename} (${mimetype}, ${(buffer.length / 1024 / 1024).toFixed(
      1,
    )} MB)`,
  );

  return new MessageMedia(mimetype, data, filename, buffer.length);
}
