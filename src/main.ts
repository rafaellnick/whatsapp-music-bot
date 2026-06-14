import client from './client';
import commands from './commands';
import { PREFIX } from './config';

const initializationRetryDelays = [0, 3000, 8000];

const sleep = (delay: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, delay));

const initializeClient = async (): Promise<void> => {
  for (const [attempt, delay] of initializationRetryDelays.entries()) {
    if (delay > 0) {
      await sleep(delay);
    }

    try {
      await client.initialize();
      return;
    } catch (error) {
      console.error(
        `WhatsApp initialize failed on attempt ${attempt + 1}/${initializationRetryDelays.length}:`,
        error,
      );

      try {
        await client.destroy();
      } catch {
        // Browser may already be closed after a failed initialization attempt.
      }
    }
  }

  throw new Error('WhatsApp initialization failed after all retry attempts.');
};

client.on('message_create', async message => {
  if (!message.body.startsWith(PREFIX)) return;

  const [command, ...rest] = message.body.split(' ');
  const content = rest.join(' ');
  
  if (!commands[command]) return;

  await commands[command].run(message, content);
});

initializeClient().catch(error => {
  console.error(error);
  process.exit(1);
});
