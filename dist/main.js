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
const fs_1 = require("fs");
const path_1 = require("path");
const client_1 = require("./client");
const commands_1 = __importDefault(require("./commands"));
const config_1 = require("./config");
const lockPath = (0, path_1.resolve)(process.env.WWEBJS_BOT_LOCK || '.wwebjs_bot.lock');
const downloadsPath = (0, path_1.resolve)(config_1.DOWNLOAD_PATH);
const restartDelayMs = Number(process.env.WWEBJS_RESTART_DELAY_MS || 5000);
let client;
let restarting = false;
const sleep = (delay) => new Promise(resolve => setTimeout(resolve, delay));
setInterval(() => {
    // Keeps the Node process alive while Puppeteer is waiting for QR authentication.
}, 60 * 1000);
const isProcessRunning = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error.code !== 'ESRCH';
    }
};
const acquireProcessLock = () => {
    if ((0, fs_1.existsSync)(lockPath)) {
        const existingPid = Number((0, fs_1.readFileSync)(lockPath, 'utf8'));
        if (Number.isFinite(existingPid) && existingPid !== process.pid && isProcessRunning(existingPid)) {
            throw new Error(`Another bot process is already running with PID ${existingPid}. Stop it before starting this one.`);
        }
        (0, fs_1.rmSync)(lockPath, { force: true });
    }
    (0, fs_1.writeFileSync)(lockPath, String(process.pid));
};
const releaseProcessLock = () => {
    if (!(0, fs_1.existsSync)(lockPath))
        return;
    const existingPid = Number((0, fs_1.readFileSync)(lockPath, 'utf8'));
    if (existingPid === process.pid) {
        (0, fs_1.rmSync)(lockPath, { force: true });
    }
};
const clearDownloadsOnStartup = () => {
    (0, fs_1.mkdirSync)(downloadsPath, { recursive: true });
    const entries = (0, fs_1.readdirSync)(downloadsPath);
    for (const entry of entries) {
        (0, fs_1.rmSync)((0, path_1.join)(downloadsPath, entry), { recursive: true, force: true });
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
const isTransientBrowserError = (error) => {
    const message = `${String(error)} ${String((error === null || error === void 0 ? void 0 : error.message) || '')}`;
    return transientBrowserErrorMessages.some(fragment => message.includes(fragment));
};
const destroyClient = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield client.destroy();
    }
    catch (_a) {
        // Browser may already be closed after a failed initialization attempt.
    }
});
const bindMessageHandler = (currentClient) => {
    currentClient.on('message_create', (message) => __awaiter(void 0, void 0, void 0, function* () {
        if (!message.body.startsWith(config_1.PREFIX))
            return;
        const [command, ...rest] = message.body.split(' ');
        const content = rest.join(' ');
        if (!commands_1.default[command])
            return;
        yield commands_1.default[command].run(message, content);
    }));
};
const watchPuppeteerProcess = (currentClient) => {
    const startedAt = Date.now();
    const watchTimeoutMs = 30000;
    const interval = setInterval(() => {
        var _a;
        if (currentClient !== client) {
            clearInterval(interval);
            return;
        }
        const puppeteerClient = currentClient;
        const browser = puppeteerClient.pupBrowser;
        const page = puppeteerClient.pupPage;
        if (!browser && Date.now() - startedAt < watchTimeoutMs)
            return;
        clearInterval(interval);
        if (!browser) {
            console.error('Puppeteer browser was not created within watcher timeout.');
            return;
        }
        browser.on('disconnected', () => {
            scheduleClientRestart('Puppeteer browser disconnected');
        });
        const browserProcess = (_a = browser.process) === null || _a === void 0 ? void 0 : _a.call(browser);
        if (browserProcess) {
            browserProcess.once('exit', (code, signal) => {
                console.error(`Puppeteer browser process exited. code=${code} signal=${signal}`);
                scheduleClientRestart(`Puppeteer browser exited with code=${code} signal=${signal}`);
            });
        }
        page === null || page === void 0 ? void 0 : page.on('close', () => {
            scheduleClientRestart('Puppeteer page closed');
        });
        page === null || page === void 0 ? void 0 : page.on('error', error => {
            console.error('Puppeteer page error:', error);
            scheduleClientRestart(error || 'Puppeteer page error');
        });
        page === null || page === void 0 ? void 0 : page.on('pageerror', error => {
            console.error('Puppeteer page runtime error:', error);
        });
        console.log('Puppeteer browser watcher attached.');
    }, 250);
};
const initializeClient = () => __awaiter(void 0, void 0, void 0, function* () {
    let attempt = 1;
    while (true) {
        client = (0, client_1.createClient)();
        bindMessageHandler(client);
        watchPuppeteerProcess(client);
        client.on('disconnected', reason => {
            scheduleClientRestart(reason);
        });
        try {
            yield client.initialize();
            return;
        }
        catch (error) {
            console.error(`WhatsApp initialize failed on attempt ${attempt}:`, error);
            yield destroyClient();
            const delay = isTransientBrowserError(error)
                ? restartDelayMs
                : Math.min(restartDelayMs * attempt, 60000);
            console.error(`Retrying WhatsApp initialization in ${delay / 1000}s...`);
            yield sleep(delay);
            attempt += 1;
        }
    }
});
const scheduleClientRestart = (reason) => {
    if (restarting)
        return;
    restarting = true;
    console.error('Restarting WhatsApp client after transient browser error:', reason);
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        yield destroyClient();
        restarting = false;
        initializeClient().catch(error => {
            console.error(error);
        });
    }), restartDelayMs);
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
