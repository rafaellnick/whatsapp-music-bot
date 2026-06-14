import fs from 'fs';
import path from 'path';
import { MessageMedia } from 'whatsapp-web.js';

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

export default function createLocalMedia(filePath: string): MessageMedia {
  const buffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mimetype = MIME_TYPES[extension] || 'application/octet-stream';
  const filename = path.basename(filePath);
  const data = buffer.toString('base64').replace(/[^A-Za-z0-9+/=]/g, '');

  return new MessageMedia(mimetype, data, filename, buffer.length);
}
