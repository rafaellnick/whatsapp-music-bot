import fs from 'fs';
import path from 'path';
import { Message, MessageMedia } from 'whatsapp-web.js';

const SEND_MEDIA_TIMEOUT_MS = Number(process.env.WHATSAPP_SEND_TIMEOUT_MS || 30000);
const MAX_VIDEO_MEDIA_MB = Math.min(Number(process.env.WHATSAPP_MAX_VIDEO_MB || 5), 8);

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

const DEFAULT_MAX_MEDIA_MB: Record<string, number> = {
  '.mp3': Number(process.env.WHATSAPP_MAX_AUDIO_MB || 20),
  '.mp4': MAX_VIDEO_MEDIA_MB,
};

type SendLocalMediaOptions = {
  asDocument?: boolean;
};

type MessageWithPuppeteerClient = Message & {
  client?: {
    pupPage?: {
      evaluate: <T>(pageFunction: () => T) => Promise<T>;
    };
  };
};

async function withTimeout<T>(promise: Promise<T>, timeoutMessage: string): Promise<T> {
  let timeout: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(timeoutMessage)), SEND_MEDIA_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout!);
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

export default async function sendLocalMedia(
  message: Message,
  filePath: string,
  options: SendLocalMediaOptions = {},
): Promise<Message> {
  const { filename, maxMediaBytes, mimetype, size } = getMediaInfo(filePath);

  if (size > maxMediaBytes) {
    throw new Error(
      `Media file ${filename} is too large for WhatsApp: ${formatMb(
        size,
      )} MB. Limit is ${formatMb(maxMediaBytes)} MB`,
    );
  }

  const chat = await message.getChat();
  const media = MessageMedia.fromFilePath(filePath);
  media.mimetype = mimetype;
  media.filename = filename;
  media.filesize = size;

  await patchWhatsappMediaDecoder(message);

  console.log(
    `Queueing media upload: ${filename} (${mimetype}, ${formatMb(size)} MB, ${
      options.asDocument ? 'document' : 'media'
    })`,
  );

  const sentMessage = await withTimeout(
    chat.sendMessage(media, {
      sendMediaAsDocument: options.asDocument,
      sendSeen: true,
    }),
    `WhatsApp media send timed out after ${SEND_MEDIA_TIMEOUT_MS / 1000}s`,
  );

  console.log(`Media queued: ${media.filename}`);

  return sentMessage;
}

function getMediaInfo(filePath: string): {
  filename: string;
  maxMediaBytes: number;
  mimetype: string;
  size: number;
} {
  const extension = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);
  const mimetype = MIME_TYPES[extension] || 'application/octet-stream';
  const maxMediaBytes =
    (DEFAULT_MAX_MEDIA_MB[extension] || Number(process.env.WHATSAPP_MAX_MEDIA_MB || 20)) *
    1024 *
    1024;
  const size = fs.statSync(filePath).size;

  return {
    filename,
    maxMediaBytes,
    mimetype,
    size,
  };
}

function formatMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

async function patchWhatsappMediaDecoder(message: Message): Promise<void> {
  const page = (message as MessageWithPuppeteerClient).client?.pupPage;

  if (!page) return;

  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const patched = await page.evaluate(() => {
        const webJs = (window as any).WWebJS;

        if (!webJs) return false;
        if (webJs.__safeMediaInfoToFilePatch) return true;

        webJs.mediaInfoToFile = ({ data, mimetype, filename }: {
          data: string;
          mimetype: string;
          filename?: string;
        }): File => {
          const rawData = String(data || '');
          const base64Data = rawData
            .replace(/^data:[^;]+;base64,/, '')
            .replace(/\s/g, '')
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          const paddedBase64Data =
            base64Data.length % 4 === 0
              ? base64Data
              : `${base64Data}${'='.repeat(4 - (base64Data.length % 4))}`;

          let binaryData: string;

          try {
            binaryData = window.atob(paddedBase64Data);
          } catch {
            binaryData = rawData;
          }

          const buffer = new ArrayBuffer(binaryData.length);
          const view = new Uint8Array(buffer);

          for (let index = 0; index < binaryData.length; index += 1) {
            view[index] = binaryData.charCodeAt(index) & 0xff;
          }

          const blob = new Blob([buffer], { type: mimetype });

          return new File([blob], filename || 'file', {
            type: mimetype,
            lastModified: Date.now(),
          });
        };

        webJs.__safeMediaInfoToFilePatch = true;
        return true;
      });

      if (patched) return;

      await sleep(250);
    }

    console.log('WhatsApp media decoder was not available before sending media.');
  } catch (error) {
    console.log('Could not patch WhatsApp media decoder:', error);
  }
}
