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
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../../config");
class YTDownload {
    download(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            fs_1.default.mkdirSync(config_1.DOWNLOAD_PATH, { recursive: true });
            const videoPath = `${config_1.DOWNLOAD_PATH}/${videoId}.mp4`;
            const audio = (0, ytdl_core_1.default)(`https://www.youtube.com/watch?v=${videoId}`, { quality: 140 }).pipe(fs_1.default.createWriteStream(videoPath));
            const downloadEnd = yield new Promise(resolve => {
                audio.on('finish', () => resolve(true));
                audio.on('error', () => resolve(false));
            });
            if (!downloadEnd) {
                // oh no i can't download this shit 😵️
            }
            return videoPath;
        });
    }
}
exports.default = YTDownload;
