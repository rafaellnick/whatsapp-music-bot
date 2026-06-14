import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join, resolve } from 'path';

import text from './language';
import { LANGUAGE } from './config';

const getExecutablePath = (): string | undefined => {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : undefined,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean) as string[];

  return candidates.find(candidate => existsSync(candidate));
};

const executablePath = getExecutablePath();
console.log(
  executablePath
    ? `Using browser executable: ${executablePath}`
    : 'Using Puppeteer bundled browser',
);

const authPath = resolve(process.env.WWEBJS_AUTH_PATH || '.wwebjs_auth');
const cachePath = resolve(process.env.WWEBJS_CACHE_PATH || '.wwebjs_cache');

const removeStaleChromiumLocks = (root: string): void => {
  if (!existsSync(root)) return;

  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);

    try {
      if (entry.startsWith('Singleton')) {
        console.log(`Removing stale Chromium profile lock: ${fullPath}`);
        rmSync(fullPath, { force: true });
        continue;
      }

      if (statSync(fullPath).isDirectory()) {
        removeStaleChromiumLocks(fullPath);
      }
    } catch (error) {
      console.log(`Could not inspect Chromium profile path: ${fullPath}`, error);
    }
  }
};

export const createClient = (): Client => {
  removeStaleChromiumLocks(authPath);

  const client = new Client({
    authTimeoutMs: 120000,
    qrMaxRetries: 5,
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    webVersionCache: {
      type: 'local',
      path: cachePath,
      strict: false,
    },
    puppeteer: {
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-default-apps',
        '--disable-features=Translate,BackForwardCache,AcceptCHFrame',
        '--no-first-run',
        '--no-zygote',
        '--mute-audio',
      ],
    },
    authStrategy: new LocalAuth({
      dataPath: authPath,
      rmMaxRetries: 10,
    }),
  });

  client.on('qr', qr => {
    console.log('QR code received. Scan it with WhatsApp > Linked devices.');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('WhatsApp authentication successful.');
  });

  client.on('auth_failure', message => {
    console.error('WhatsApp authentication failed:', message);
    console.error('Try running: npm run reset:auth');
  });

  client.on('loading_screen', (percent, message) => {
    console.log(`WhatsApp loading: ${percent}% - ${message}`);
  });

  client.on('change_state', state => {
    console.log(`WhatsApp state changed: ${state}`);
  });

  client.on('disconnected', reason => {
    console.error('WhatsApp disconnected:', reason);
  });

  client.on('remote_session_saved', () => {
    console.log('WhatsApp remote session saved.');
  });

  client.on('ready', async () => {
    console.log(text[LANGUAGE].CONNECTED);
  });

  return client;
};

export default createClient;
