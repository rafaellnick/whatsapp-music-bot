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
const whatsapp_web_js_1 = require("whatsapp-web.js");
const SEND_MEDIA_TIMEOUT_MS = Number(process.env.WHATSAPP_SEND_TIMEOUT_MS || 30000);
const MAX_VIDEO_MEDIA_MB = Math.min(Number(process.env.WHATSAPP_MAX_VIDEO_MB || 8), 12);
const MIME_TYPES = {
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
};
const DEFAULT_MAX_MEDIA_MB = {
    '.mp3': Number(process.env.WHATSAPP_MAX_AUDIO_MB || 20),
    '.mp4': MAX_VIDEO_MEDIA_MB,
};
function withTimeout(promise, timeoutMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        let timeout;
        const timeoutPromise = new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error(timeoutMessage)), SEND_MEDIA_TIMEOUT_MS);
        });
        try {
            return yield Promise.race([promise, timeoutPromise]);
        }
        finally {
            clearTimeout(timeout);
        }
    });
}
function sleep(delayMs) {
    return new Promise(resolve => setTimeout(resolve, delayMs));
}
function sendLocalMedia(message, filePath, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const { filename, maxMediaBytes, mimetype, size } = getMediaInfo(filePath);
        if (size > maxMediaBytes) {
            throw new Error(`Media file ${filename} is too large for WhatsApp: ${formatMb(size)} MB. Limit is ${formatMb(maxMediaBytes)} MB`);
        }
        const chat = yield message.getChat();
        const media = whatsapp_web_js_1.MessageMedia.fromFilePath(filePath);
        media.mimetype = mimetype;
        media.filename = filename;
        media.filesize = size;
        yield patchWhatsappMediaDecoder(message);
        console.log(`Queueing media upload: ${filename} (${mimetype}, ${formatMb(size)} MB, ${options.asDocument ? 'document' : 'media'})`);
        const sentMessage = yield withTimeout(chat.sendMessage(media, {
            sendMediaAsDocument: options.asDocument,
            sendSeen: true,
        }), `WhatsApp media send timed out after ${SEND_MEDIA_TIMEOUT_MS / 1000}s`);
        console.log(`Media queued: ${media.filename}`);
        return sentMessage;
    });
}
exports.default = sendLocalMedia;
function getMediaInfo(filePath) {
    const extension = path_1.default.extname(filePath).toLowerCase();
    const filename = path_1.default.basename(filePath);
    const mimetype = MIME_TYPES[extension] || 'application/octet-stream';
    const maxMediaBytes = (DEFAULT_MAX_MEDIA_MB[extension] || Number(process.env.WHATSAPP_MAX_MEDIA_MB || 20)) *
        1024 *
        1024;
    const size = fs_1.default.statSync(filePath).size;
    return {
        filename,
        maxMediaBytes,
        mimetype,
        size,
    };
}
function formatMb(bytes) {
    return (bytes / 1024 / 1024).toFixed(1);
}
function patchWhatsappMediaDecoder(message) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const page = (_a = message.client) === null || _a === void 0 ? void 0 : _a.pupPage;
        if (!page)
            return;
        try {
            for (let attempt = 0; attempt < 40; attempt += 1) {
                const patched = yield page.evaluate(() => {
                    const webJs = window.WWebJS;
                    if (!webJs)
                        return false;
                    if (webJs.__safeMediaInfoToFilePatch)
                        return true;
                    webJs.mediaInfoToFile = ({ data, mimetype, filename }) => {
                        const rawData = String(data || '');
                        const base64Data = rawData
                            .replace(/^data:[^;]+;base64,/, '')
                            .replace(/\s/g, '')
                            .replace(/-/g, '+')
                            .replace(/_/g, '/');
                        const paddedBase64Data = base64Data.length % 4 === 0
                            ? base64Data
                            : `${base64Data}${'='.repeat(4 - (base64Data.length % 4))}`;
                        let binaryData;
                        try {
                            binaryData = window.atob(paddedBase64Data);
                        }
                        catch (_a) {
                            binaryData = rawData;
                        }
                        const buffer = new ArrayBuffer(binaryData.length);
                        const view = new Uint8Array(buffer);
                        for (let index = 0; index < binaryData.length; index += 1) {
                            view[index] = binaryData.charCodeAt(index) & 0xff;
                        }
                        const blob = new Blob([buffer], { type: mimetype });
                        return new File([blob], filename || 'file', {
                            type: mimetype,
                            lastModified: Date.now(),
                        });
                    };
                    webJs.__safeMediaInfoToFilePatch = true;
                    return true;
                });
                if (patched)
                    return;
                yield sleep(250);
            }
            console.log('WhatsApp media decoder was not available before sending media.');
        }
        catch (error) {
            console.log('Could not patch WhatsApp media decoder:', error);
        }
    });
}
