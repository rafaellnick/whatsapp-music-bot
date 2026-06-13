"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const fs_1 = require("fs");
const path_1 = require("path");
const language_1 = __importDefault(require("./language"));
const config_1 = require("./config");
const getExecutablePath = () => {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : undefined,
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ].filter(Boolean);
    return candidates.find(candidate => (0, fs_1.existsSync)(candidate));
};
const executablePath = getExecutablePath();
console.log(executablePath
    ? `Using browser executable: ${executablePath}`
    : 'Using Puppeteer bundled browser');
const removeStaleChromiumLocks = (root) => {
    if (!(0, fs_1.existsSync)(root))
        return;
    for (const entry of (0, fs_1.readdirSync)(root)) {
        const fullPath = (0, path_1.join)(root, entry);
        try {
            if (entry.startsWith('Singleton')) {
                console.log(`Removing stale Chromium profile lock: ${fullPath}`);
                (0, fs_1.rmSync)(fullPath, { force: true });
                continue;
            }
            if ((0, fs_1.statSync)(fullPath).isDirectory()) {
                removeStaleChromiumLocks(fullPath);
            }
        }
        catch (error) {
            console.log(`Could not inspect Chromium profile path: ${fullPath}`, error);
        }
    }
};
['.wwebjs_auth', '.wwebjs_cache', '/tmp/.chromium'].forEach(removeStaleChromiumLocks);
const client = new whatsapp_web_js_1.Client({
    puppeteer: Object.assign(Object.assign({}, (executablePath ? { executablePath } : {})), { headless: true, args: [
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
        ] }),
    authStrategy: new whatsapp_web_js_1.LocalAuth(),
});
client.on('qr', qr => {
    console.log('QR code received. Scan it with WhatsApp > Linked devices.');
    qrcode_terminal_1.default.generate(qr, { small: true });
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
client.on('ready', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(language_1.default[config_1.LANGUAGE].CONNECTED);
}));
exports.default = client;
