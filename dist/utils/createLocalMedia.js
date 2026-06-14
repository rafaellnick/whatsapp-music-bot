"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const whatsapp_web_js_1 = require("whatsapp-web.js");
const MIME_TYPES = {
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
};
function createLocalMedia(filePath) {
    const buffer = fs_1.default.readFileSync(filePath);
    const extension = path_1.default.extname(filePath).toLowerCase();
    const mimetype = MIME_TYPES[extension] || 'application/octet-stream';
    const filename = path_1.default.basename(filePath);
    const data = buffer.toString('base64').replace(/[^A-Za-z0-9+/=]/g, '');
    return new whatsapp_web_js_1.MessageMedia(mimetype, data, filename, buffer.length);
}
exports.default = createLocalMedia;
