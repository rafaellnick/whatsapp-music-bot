import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

import text from './language';
import { LANGUAGE } from './config';

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  || (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/chromium');

const client = new Client({
  puppeteer: {
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
