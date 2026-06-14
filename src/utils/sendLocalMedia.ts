import { Message, MessageMedia } from 'whatsapp-web.js';

const SEND_MEDIA_TIMEOUT_MS = Number(process.env.WHATSAPP_SEND_TIMEOUT_MS || 120000);

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

export default async function sendLocalMedia(
  message: Message,
  media: MessageMedia,
): Promise<Message> {
  const chat = await message.getChat();

  console.log(`Uploading media as document: ${media.filename}`);

  const sentMessage = await withTimeout(
    chat.sendMessage(media, {
      sendMediaAsDocument: true,
      waitUntilMsgSent: true,
      sendSeen: true,
    }),
    `WhatsApp media send timed out after ${SEND_MEDIA_TIMEOUT_MS / 1000}s`,
  );

  console.log(`Media sent: ${media.filename}`);

  return sentMessage;
}
