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
const client_1 = __importDefault(require("./client"));
const commands_1 = __importDefault(require("./commands"));
const config_1 = require("./config");
const initializationRetryDelays = [0, 3000, 8000];
const sleep = (delay) => new Promise(resolve => setTimeout(resolve, delay));
const initializeClient = () => __awaiter(void 0, void 0, void 0, function* () {
    for (const [attempt, delay] of initializationRetryDelays.entries()) {
        if (delay > 0) {
            yield sleep(delay);
        }
        try {
            yield client_1.default.initialize();
            return;
        }
        catch (error) {
            console.error(`WhatsApp initialize failed on attempt ${attempt + 1}/${initializationRetryDelays.length}:`, error);
            try {
                yield client_1.default.destroy();
            }
            catch (_a) {
                // Browser may already be closed after a failed initialization attempt.
            }
        }
    }
    throw new Error('WhatsApp initialization failed after all retry attempts.');
});
client_1.default.on('message_create', (message) => __awaiter(void 0, void 0, void 0, function* () {
    if (!message.body.startsWith(config_1.PREFIX))
        return;
    const [command, ...rest] = message.body.split(' ');
    const content = rest.join(' ');
    if (!commands_1.default[command])
        return;
    yield commands_1.default[command].run(message, content);
}));
initializeClient().catch(error => {
    console.error(error);
    process.exit(1);
});
