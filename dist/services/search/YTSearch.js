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
const yt_search_1 = require("yt-search");
const config_1 = require("../../config");
class YTSearch {
    constructor() {
        this.pageStart = 1;
        this.pageEnd = 1;
    }
    find(keyword) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = this.generateOptions(keyword);
            const { videos } = yield (0, yt_search_1.search)(options);
            const { seconds, title, videoId, url } = yield this.getFirstValid(videos);
            return {
                seconds,
                title,
                videoId,
                url,
            };
        });
    }
    generateOptions(query) {
        return {
            query,
            pageStart: this.pageStart,
            pageEnd: this.pageEnd,
        };
    }
    getFirstValid(videos) {
        return videos[0].seconds <= config_1.MAX_DURATION
            ? videos[0]
            : this.getFirstValid(videos.slice(1));
    }
}
exports.default = YTSearch;
