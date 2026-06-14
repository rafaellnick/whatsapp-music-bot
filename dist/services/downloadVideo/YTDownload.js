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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../../config");
const YTDlp_1 = require("../download/YTDlp");
class YTDownload {
    download(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            fs_1.default.mkdirSync(config_1.DOWNLOAD_PATH, { recursive: true });
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const videoPath = path_1.default.join(config_1.DOWNLOAD_PATH, `${videoId}.mp4`);
            fs_1.default.rmSync(videoPath, { force: true });
            yield (0, YTDlp_1.runYtDlp)([
                '--no-playlist',
                '--force-overwrites',
                '--no-part',
                '--format',
                'worst[ext=mp4][height<=240][vcodec!=none][acodec!=none]/best[ext=mp4][height<=240][vcodec!=none][acodec!=none]/worst[ext=mp4][vcodec!=none][acodec!=none]/18',
                '--output',
                videoPath,
                ...(0, YTDlp_1.getYtDlpRuntimeArgs)(),
                videoUrl,
            ]);
            if (!fs_1.default.existsSync(videoPath) || fs_1.default.statSync(videoPath).size === 0) {
                throw new Error(`Could not download video ${videoId}`);
            }
            return videoPath;
        });
    }
}
exports.default = YTDownload;
