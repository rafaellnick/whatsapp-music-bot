import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Client } from 'whatsapp-web.js';
import { ChildProcess } from 'child_process';
import { createClient } from './client';
import commands from './commands';
import { DOWNLOAD_PATH, PREFIX } from './config';

const lockPath = resolve(process.env.WWEBJS_BOT_LOCK || '.wwebjs_bot.lock');
const downloadsPath = resolve(DOWNLOAD_PATH);
const restartDelayMs = Number(process.env.WWEBJS_RESTART_DELAY_MS || 5000);
let client: Client;
let restarting = false;

type ClientWithPuppeteerInternals = Client & {
  pupBrowser?: {
    on: (event: 'disconnected', listener: () => void) => void;
    process?: () => ChildProcess | null;
  } | null;
  pupPage?: {
    on: (event: 'close' | 'error' | 'pageerror', listener: (error?: unknown) => void) => void;
  } | null;
};

const sleep = (delay: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, delay));

setInterval(() => {
  // Keeps the Node process alive while Puppeteer is waiting for QR authentication.
}, 60 * 1000);

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

const clearDownloadsOnStartup = (): void => {
  mkdirSync(downloadsPath, { recursive: true });

  const entries = readdirSync(downloadsPath);

  for (const entry of entries) {
    rmSync(join(downloadsPath, entry), { recursive: true, force: true });
  }

  console.log(`Cleared downloads folder on startup (${entries.length} item(s) removed).`);
};

const transientBrowserErrorMessages = [
  'Execution context was destroyed',
  'Protocol error',
  'Session closed',
  'Target closed',
  'Target page, context or browser has been closed',
  'Most likely the page has been closed',
  'Navigation failed because browser has disconnected',
];

const isTransientBrowserError = (error: unknown): boolean => {
  const message = `${String(error)} ${String((error as Error)?.message || '')}`;
  return transientBrowserErrorMessages.some(fragment => message.includes(fragment));
};

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

const watchPuppeteerProcess = (currentClient: Client): void => {
  const startedAt = Date.now();
  const watchTimeoutMs = 30000;

  const interval = setInterval(() => {
    if (currentClient !== client) {
      clearInterval(interval);
      return;
    }

    const puppeteerClient = currentClient as ClientWithPuppeteerInternals;
    const browser = puppeteerClient.pupBrowser;
    const page = puppeteerClient.pupPage;

    if (!browser && Date.now() - startedAt < watchTimeoutMs) return;

    clearInterval(interval);

    if (!browser) {
      console.error('Puppeteer browser was not created within watcher timeout.');
      return;
    }

    browser.on('disconnected', () => {
      scheduleClientRestart('Puppeteer browser disconnected');
    });

    const browserProcess = browser.process?.();
    if (browserProcess) {
      browserProcess.once('exit', (code, signal) => {
        console.error(`Puppeteer browser process exited. code=${code} signal=${signal}`);
        scheduleClientRestart(`Puppeteer browser exited with code=${code} signal=${signal}`);
      });
    }

    page?.on('close', () => {
      scheduleClientRestart('Puppeteer page closed');
    });

    page?.on('error', error => {
      console.error('Puppeteer page error:', error);
      scheduleClientRestart(error || 'Puppeteer page error');
    });

    page?.on('pageerror', error => {
      console.error('Puppeteer page runtime error:', error);
    });

    console.log('Puppeteer browser watcher attached.');
  }, 250);
};

const initializeClient = async (): Promise<void> => {
  let attempt = 1;

  while (true) {
    client = createClient();
    bindMessageHandler(client);
    watchPuppeteerProcess(client);
    client.on('disconnected', reason => {
      scheduleClientRestart(reason);
    });

    try {
      await client.initialize();
      return;
    } catch (error) {
      console.error(`WhatsApp initialize failed on attempt ${attempt}:`, error);
      await destroyClient();

      const delay = isTransientBrowserError(error)
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
  if (isTransientBrowserError(reason)) {
    scheduleClientRestart(reason);
    return;
  }

  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', error => {
  if (isTransientBrowserError(error)) {
    scheduleClientRestart(error);
    return;
  }

  console.error('Uncaught exception:', error);
  releaseProcessLock();
  process.exit(1);
});

process.on('warning', warning => {
  console.warn('Process warning:', warning);
});

process.on('beforeExit', code => {
  console.error(`Node process beforeExit with code ${code}.`);
});

process.on('exit', code => {
  console.error(`Node process exit with code ${code}.`);
  releaseProcessLock();
});
process.on('SIGINT', () => {
  releaseProcessLock();
  process.exit(0);
});
process.on('SIGTERM', () => {
  releaseProcessLock();
  process.exit(0);
});

acquireProcessLock();
clearDownloadsOnStartup();
initializeClient().catch(error => {
  console.error(error);
  releaseProcessLock();
  process.exit(1);
});
