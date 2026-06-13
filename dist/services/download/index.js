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
const base_1 = __importDefault(require("./base"));
const YTDownload_1 = __importDefault(require("./YTDownload"));
class Downloader extends base_1.default {
    constructor() {
        super();
        this.ytDownload = new YTDownload_1.default();
        this.musics = this.getCachedMusics();
        console.log(this.musics);
    }
    handle(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isMusicDownloaded(videoId)) {
                return `downloads/${videoId}.mp3`;
            }
            const result = yield this.ytDownload.download(videoId);
            this.musics = [...this.musics, `${videoId}.mp3`];
            return result;
        });
    }
    isMusicDownloaded(videoId) {
        return this.musics.includes(`${videoId}.mp3`);
    }
    getCachedMusics() {
        if (!fs_1.default.existsSync(`downloads`)) {
            fs_1.default.mkdirSync(`downloads`, { recursive: true });
        }
        return fs_1.default.readdirSync(`downloads`);
    }
}
exports.default = Downloader;
