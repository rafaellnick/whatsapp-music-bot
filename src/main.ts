import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'whatsapp-web.js';
import { createClient } from './client';
import commands from './commands';
import { PREFIX } from './config';

const lockPath = resolve(process.env.WWEBJS_BOT_LOCK || '.wwebjs_bot.lock');
const restartDelayMs = Number(process.env.WWEBJS_RESTART_DELAY_MS || 5000);
let client: Client;
let restarting = false;

const sleep = (delay: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, delay));

const isProcessRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH';
  }
};

const acquireProcessLock = (): void => {
  if (existsSync(lockPath)) {
    const existingPid = Number(readFileSync(lockPath, 'utf8'));

    if (Number.isFinite(existingPid) && existingPid !== process.pid && isProcessRunning(existingPid)) {
      throw new Error(
        `Another bot process is already running with PID ${existingPid}. Stop it before starting this one.`,
      );
    }

    rmSync(lockPath, { force: true });
  }

  writeFileSync(lockPath, String(process.pid));
};

const releaseProcessLock = (): void => {
  if (!existsSync(lockPath)) return;

  const existingPid = Number(readFileSync(lockPath, 'utf8'));
  if (existingPid === process.pid) {
    rmSync(lockPath, { force: true });
  }
};

const isExecutionContextDestroyed = (error: unknown): boolean =>
  String(error).includes('Execution context was destroyed') ||
  String((error as Error)?.message).includes('Execution context was destroyed');

const destroyClient = async (): Promise<void> => {
  try {
    await client.destroy();
  } catch {
    // Browser may already be closed after a failed initialization attempt.
  }
};

const bindMessageHandler = (currentClient: Client): void => {
  currentClient.on('message_create', async message => {
    if (!message.body.startsWith(PREFIX)) return;

    const [command, ...rest] = message.body.split(' ');
    const content = rest.join(' ');

    if (!commands[command]) return;

    await commands[command].run(message, content);
  });
};

const initializeClient = async (): Promise<void> => {
  let attempt = 1;

  while (true) {
    client = createClient();
    bindMessageHandler(client);

    try {
      await client.initialize();
      return;
    } catch (error) {
      console.error(`WhatsApp initialize failed on attempt ${attempt}:`, error);
      await destroyClient();

      const delay = isExecutionContextDestroyed(error)
        ? restartDelayMs
        : Math.min(restartDelayMs * attempt, 60000);

      console.error(`Retrying WhatsApp initialization in ${delay / 1000}s...`);
      await sleep(delay);
      attempt += 1;
    }
  }
};

const scheduleClientRestart = (reason: unknown): void => {
  if (restarting) return;
  restarting = true;

  console.error('Restarting WhatsApp client after transient browser error:', reason);

  setTimeout(async () => {
    await destroyClient();
    restarting = false;
    initializeClient().catch(error => {
      console.error(error);
    });
  }, restartDelayMs);
};

process.on('unhandledRejection', reason => {
  if (isExecutionContextDestroyed(reason)) {
    scheduleClientRestart(reason);
    return;
  }

  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', error => {
  if (isExecutionContextDestroyed(error)) {
    scheduleClientRestart(error);
    return;
  }

  console.error('Uncaught exception:', error);
  releaseProcessLock();
  process.exit(1);
});

process.on('exit', releaseProcessLock);
process.on('SIGINT', () => {
  releaseProcessLock();
  process.exit(0);
});
process.on('SIGTERM', () => {
  releaseProcessLock();
  process.exit(0);
});

acquireProcessLock();
initializeClient().catch(error => {
  console.error(error);
  releaseProcessLock();
  process.exit(1);
});
