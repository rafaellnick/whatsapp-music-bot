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
const download_1 = __importDefault(require("../services/download"));
const search_1 = __importDefault(require("../services/search"));
const language_1 = __importDefault(require("../language"));
const config_1 = require("../config");
const sendLocalMedia_1 = __importDefault(require("../utils/sendLocalMedia"));
exports.default = {
    run: (message, keyword) => __awaiter(void 0, void 0, void 0, function* () {
        const downloader = new download_1.default();
        const searcher = new search_1.default();
        try {
            const { title, videoId } = yield searcher.handle(keyword);
            message.reply(`${language_1.default[config_1.LANGUAGE].FOUNDED} "${title}"`);
            message.reply(language_1.default[config_1.LANGUAGE].DOWNLOAD_STARTED);
            const music = yield downloader.handle(videoId);
            return yield (0, sendLocalMedia_1.default)(message, music);
        }
        catch (error) {
            console.log(error);
            return message.reply(language_1.default[config_1.LANGUAGE].ERROR);
        }
    }),
    help: language_1.default[config_1.LANGUAGE].HELP_PLAY,
};
