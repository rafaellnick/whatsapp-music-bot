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
Object.defineProperty(exports, "__esModule", { value: true });
const SEND_MEDIA_TIMEOUT_MS = Number(process.env.WHATSAPP_SEND_TIMEOUT_MS || 120000);
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
function sendLocalMedia(message, media) {
    return __awaiter(this, void 0, void 0, function* () {
        const chat = yield message.getChat();
        console.log(`Uploading media as document: ${media.filename}`);
        const sentMessage = yield withTimeout(chat.sendMessage(media, {
            sendMediaAsDocument: true,
            waitUntilMsgSent: true,
            sendSeen: true,
        }), `WhatsApp media send timed out after ${SEND_MEDIA_TIMEOUT_MS / 1000}s`);
        console.log(`Media sent: ${media.filename}`);
        return sentMessage;
    });
}
exports.default = sendLocalMedia;
