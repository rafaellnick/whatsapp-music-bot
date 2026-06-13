import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

import text from './language';
import { LANGUAGE } from './config';

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  || (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/google-chrome-stable');

const client = new Client({
  puppeteer: {
    executablePath,
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
      '--no-first-run',
      '--no-zygote',
      '--mute-audio',
    ],
  },
  authStrategy: new LocalAuth(),
});
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
  console.log(text[LANGUAGE].CONNECTED);
});

export default client;
