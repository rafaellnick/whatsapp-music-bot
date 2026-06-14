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
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const config_1 = require("../../config");
const YTDlp_1 = require("../download/YTDlp");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const MAX_VIDEO_BYTES = Number(process.env.WHATSAPP_MAX_VIDEO_MB || 15) * 1024 * 1024;
const TARGET_VIDEO_BYTES = Math.floor(MAX_VIDEO_BYTES * 0.9);
class YTDownload {
    download(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            fs_1.default.mkdirSync(config_1.DOWNLOAD_PATH, { recursive: true });
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const sourcePath = path_1.default.join(config_1.DOWNLOAD_PATH, `${videoId}.source.mp4`);
            const videoPath = path_1.default.join(config_1.DOWNLOAD_PATH, `${videoId}.mp4`);
            fs_1.default.rmSync(sourcePath, { force: true });
            fs_1.default.rmSync(videoPath, { force: true });
            yield (0, YTDlp_1.runYtDlp)([
                '--no-playlist',
                '--force-overwrites',
                '--no-part',
                '--format',
                'worst[ext=mp4][height<=240][vcodec!=none][acodec!=none]/best[ext=mp4][height<=240][vcodec!=none][acodec!=none]/worst[ext=mp4][vcodec!=none][acodec!=none]/18',
                '--output',
                sourcePath,
                ...(0, YTDlp_1.getYtDlpRuntimeArgs)(),
                videoUrl,
            ]);
            if (!fs_1.default.existsSync(sourcePath) || fs_1.default.statSync(sourcePath).size === 0) {
                throw new Error(`Could not download video ${videoId}`);
            }
            if (fs_1.default.statSync(sourcePath).size <= TARGET_VIDEO_BYTES) {
                fs_1.default.renameSync(sourcePath, videoPath);
                return videoPath;
            }
            yield this.compressForWhatsApp(sourcePath, videoPath);
            fs_1.default.rmSync(sourcePath, { force: true });
            if (!fs_1.default.existsSync(videoPath) || fs_1.default.statSync(videoPath).size === 0) {
                throw new Error(`Could not compress video ${videoId}`);
            }
            return videoPath;
        });
    }
    compressForWhatsApp(sourcePath, outputPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ffmpeg_static_1.default) {
                throw new Error('ffmpeg-static binary was not found');
            }
            const durationSeconds = yield this.getDurationSeconds(sourcePath);
            const totalBitrateKbps = Math.max(96, Math.floor((TARGET_VIDEO_BYTES * 8) / durationSeconds / 1000));
            const audioBitrateKbps = durationSeconds > 600 ? 32 : 48;
            const videoBitrateKbps = Math.max(64, totalBitrateKbps - audioBitrateKbps);
            console.log(`Compressing video for WhatsApp media: ${videoBitrateKbps}k video, ${audioBitrateKbps}k audio`);
            yield execFileAsync(ffmpeg_static_1.default, [
                '-y',
                '-i',
                sourcePath,
                '-vf',
                'scale=-2:240',
                '-c:v',
                'libx264',
                '-preset',
                'veryfast',
                '-profile:v',
                'baseline',
                '-level',
                '3.0',
                '-pix_fmt',
                'yuv420p',
                '-b:v',
                `${videoBitrateKbps}k`,
                '-maxrate',
                `${videoBitrateKbps}k`,
                '-bufsize',
                `${videoBitrateKbps * 2}k`,
                '-c:a',
                'aac',
                '-b:a',
                `${audioBitrateKbps}k`,
                '-movflags',
                '+faststart',
                outputPath,
            ], {
                maxBuffer: 20 * 1024 * 1024,
            });
        });
    }
    getDurationSeconds(videoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ffmpeg_static_1.default) {
                throw new Error('ffmpeg-static binary was not found');
            }
            try {
                yield execFileAsync(ffmpeg_static_1.default, ['-i', videoPath], {
                    maxBuffer: 4 * 1024 * 1024,
                });
            }
            catch (error) {
                const stderr = error.stderr || '';
                const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
                if (match) {
                    const [, hours, minutes, seconds] = match;
                    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
                }
            }
            return 300;
        });
    }
}
exports.default = YTDownload;
