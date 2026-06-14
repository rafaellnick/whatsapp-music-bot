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
const restartDelayMs = Number(process.env.WWEBJS_RESTART_DELAY_MS || 5000);
let client;
let restarting = false;
const sleep = (delay) => new Promise(resolve => setTimeout(resolve, delay));
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
const isExecutionContextDestroyed = (error) => String(error).includes('Execution context was destroyed') ||
    String(error === null || error === void 0 ? void 0 : error.message).includes('Execution context was destroyed');
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
const initializeClient = () => __awaiter(void 0, void 0, void 0, function* () {
    let attempt = 1;
    while (true) {
        client = (0, client_1.createClient)();
        bindMessageHandler(client);
        try {
            yield client.initialize();
            return;
        }
        catch (error) {
            console.error(`WhatsApp initialize failed on attempt ${attempt}:`, error);
            yield destroyClient();
            const delay = isExecutionContextDestroyed(error)
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
