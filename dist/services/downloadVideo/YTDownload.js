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
const MAX_VIDEO_MB = Math.min(Number(process.env.WHATSAPP_MAX_VIDEO_MB || 5), 8);
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const TARGET_VIDEO_BYTES = Math.floor(MAX_VIDEO_BYTES * 0.9);
const SOURCE_FILE_MARKER = '.source.';
class YTDownload {
    download(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            fs_1.default.mkdirSync(config_1.DOWNLOAD_PATH, { recursive: true });
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const sourceTemplate = path_1.default.join(config_1.DOWNLOAD_PATH, `${videoId}${SOURCE_FILE_MARKER}%(ext)s`);
            const videoPath = path_1.default.join(config_1.DOWNLOAD_PATH, `${videoId}.mp4`);
            this.removeSourceFiles(videoId);
            fs_1.default.rmSync(videoPath, { force: true });
            yield (0, YTDlp_1.runYtDlp)([
                '--no-playlist',
                '--force-overwrites',
                '--no-part',
                '--format',
                'worst[ext=mp4][height<=240][vcodec!=none][acodec!=none]/best[ext=mp4][height<=240][vcodec!=none][acodec!=none]/worst[ext=mp4][vcodec!=none][acodec!=none]/18',
                '--output',
                sourceTemplate,
                ...(0, YTDlp_1.getYtDlpRuntimeArgs)(),
                videoUrl,
            ]);
            const sourcePath = this.findSourceFile(videoId);
            if (!fs_1.default.existsSync(sourcePath) || fs_1.default.statSync(sourcePath).size === 0) {
                throw new Error(`Could not download video ${videoId}`);
            }
            try {
                yield this.compressForWhatsApp(sourcePath, videoPath);
            }
            finally {
                fs_1.default.rmSync(sourcePath, { force: true });
            }
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
            console.log(`Compressing video for WhatsApp media (${MAX_VIDEO_MB} MB max): ${videoBitrateKbps}k video, ${audioBitrateKbps}k audio`);
            yield this.runFfmpeg([
                '-y',
                '-i',
                sourcePath,
                '-map',
                '0:v:0',
                '-map',
                '0:a:0?',
                '-sn',
                '-dn',
                '-vf',
                'scale=-2:240',
                '-r',
                '24',
                '-c:v',
                'libx264',
                '-tag:v',
                'avc1',
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
                '-ac',
                '1',
                '-movflags',
                '+faststart',
                outputPath,
            ]);
            if (fs_1.default.statSync(outputPath).size > MAX_VIDEO_BYTES) {
                console.log('Compressed video is still too large. Running a smaller fallback encode.');
                yield this.runFfmpeg([
                    '-y',
                    '-i',
                    sourcePath,
                    '-map',
                    '0:v:0',
                    '-map',
                    '0:a:0?',
                    '-sn',
                    '-dn',
                    '-vf',
                    'scale=-2:180',
                    '-r',
                    '18',
                    '-c:v',
                    'libx264',
                    '-tag:v',
                    'avc1',
                    '-preset',
                    'veryfast',
                    '-profile:v',
                    'baseline',
                    '-level',
                    '3.0',
                    '-pix_fmt',
                    'yuv420p',
                    '-b:v',
                    '96k',
                    '-maxrate',
                    '96k',
                    '-bufsize',
                    '192k',
                    '-c:a',
                    'aac',
                    '-b:a',
                    '24k',
                    '-ac',
                    '1',
                    '-movflags',
                    '+faststart',
                    outputPath,
                ]);
            }
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
    findSourceFile(videoId) {
        const sourceFile = fs_1.default
            .readdirSync(config_1.DOWNLOAD_PATH)
            .find(file => file.startsWith(`${videoId}${SOURCE_FILE_MARKER}`));
        if (!sourceFile) {
            throw new Error(`Could not find downloaded source video for ${videoId}`);
        }
        return path_1.default.join(config_1.DOWNLOAD_PATH, sourceFile);
    }
    removeSourceFiles(videoId) {
        if (!fs_1.default.existsSync(config_1.DOWNLOAD_PATH))
            return;
        for (const file of fs_1.default.readdirSync(config_1.DOWNLOAD_PATH)) {
            if (file.startsWith(`${videoId}${SOURCE_FILE_MARKER}`)) {
                fs_1.default.rmSync(path_1.default.join(config_1.DOWNLOAD_PATH, file), { force: true });
            }
        }
    }
    runFfmpeg(args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ffmpeg_static_1.default) {
                throw new Error('ffmpeg-static binary was not found');
            }
            try {
                yield execFileAsync(ffmpeg_static_1.default, args, {
                    maxBuffer: 50 * 1024 * 1024,
                });
            }
            catch (error) {
                const failure = error;
                const details = [failure.stderr, failure.stdout, failure.message]
                    .filter(Boolean)
                    .join('\n')
                    .trim();
                throw new Error(`ffmpeg failed while compressing video:\n${details}`);
            }
        });
    }
}
exports.default = YTDownload;
