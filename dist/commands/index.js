"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const play_1 = __importDefault(require("./play"));
const help_1 = __importDefault(require("./help"));
const video_1 = __importDefault(require("./video"));
exports.default = {
    [`${config_1.PREFIX}play`]: play_1.default,
    [`${config_1.PREFIX}help`]: help_1.default,
    [`${config_1.PREFIX}video`]: video_1.default,
};
