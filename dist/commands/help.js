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
const language_1 = __importDefault(require("../language"));
const config_1 = require("../config");
const _1 = __importDefault(require("."));
exports.default = {
    run: (message, keyword) => __awaiter(void 0, void 0, void 0, function* () {
        if (!keyword)
            return message.reply(`${language_1.default[config_1.LANGUAGE].AVAILABLE_COMMANDS}: ${Object.keys(_1.default).join(', ')}`);
        try {
            const helpText = _1.default[`${config_1.PREFIX}${keyword}`].help;
            return message.reply(helpText);
        }
        catch (error) {
            return message.reply(`${language_1.default[config_1.LANGUAGE].ERROR}`);
        }
    }),
    help: language_1.default[config_1.LANGUAGE].HELP_HELP,
};
