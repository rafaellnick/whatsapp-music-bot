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
const allCommands = ["play", "help"];
client_1.default.initialize();
client_1.default.on('message_create', (message) => __awaiter(void 0, void 0, void 0, function* () {
    if (!message.body.startsWith(config_1.PREFIX))
        return;
    const [command, ...rest] = message.body.split(' ');
    const content = rest.join(' ');
    if (!allCommands.includes(command.substring(1)))
        return;
    commands_1.default[command].run(message, content);
}));
