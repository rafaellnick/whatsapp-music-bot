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
const base_1 = __importDefault(require("./base"));
const YTDownload_1 = __importDefault(require("./YTDownload"));
const config_1 = require("../../config");
const MAX_CACHED_VIDEO_BYTES = Number(process.env.WHATSAPP_MAX_VIDEO_MB || 64) * 1024 * 1024;
class Downloader extends base_1.default {
    constructor() {
        super();
        this.ytDownload = new YTDownload_1.default();
        this.musics = this.getCachedMusics();
        console.log(this.musics);
    }
    handle(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            const videoPath = path_1.default.join(config_1.DOWNLOAD_PATH, `${videoId}.mp4`);
            if (this.isMusicDownloaded(videoId) && this.isVideoUsable(videoPath)) {
                return videoPath;
            }
            if (fs_1.default.existsSync(videoPath)) {
                fs_1.default.rmSync(videoPath, { force: true });
                this.musics = this.musics.filter(music => music !== `${videoId}.mp4`);
            }
            const result = yield this.ytDownload.download(videoId);
            const resultSize = fs_1.default.existsSync(result) ? fs_1.default.statSync(result).size : 0;
            if (!this.isVideoUsable(result)) {
                fs_1.default.rmSync(result, { force: true });
                throw new Error(`Downloaded video is too large for WhatsApp (${this.formatBytes(resultSize)}). Try the audio command instead.`);
            }
            this.musics = [...this.musics, `${videoId}.mp4`];
            return result;
        });
    }
    isMusicDownloaded(videoId) {
        return this.musics.includes(`${videoId}.mp4`);
    }
    isVideoUsable(videoPath) {
        return fs_1.default.existsSync(videoPath) && fs_1.default.statSync(videoPath).size <= MAX_CACHED_VIDEO_BYTES;
    }
    formatBytes(bytes) {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
    getCachedMusics() {
        if (!fs_1.default.existsSync(config_1.DOWNLOAD_PATH)) {
            fs_1.default.mkdirSync(config_1.DOWNLOAD_PATH, { recursive: true });
        }
        return fs_1.default.readdirSync(config_1.DOWNLOAD_PATH);
    }
}
exports.default = Downloader;
