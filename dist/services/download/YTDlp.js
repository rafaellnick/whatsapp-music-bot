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
exports.runYtDlp = exports.resolveYtDlpPath = exports.getYtDlpRuntimeArgs = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const projectRoot = path_1.default.resolve(__dirname, '../../..');
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const denoName = process.platform === 'win32' ? 'deno.exe' : 'deno';
const localYtDlpPath = path_1.default.join(projectRoot, 'bin', binaryName);
const localDenoPath = path_1.default.join(projectRoot, 'bin', denoName);
const timeoutMs = Number(process.env.YT_DLP_TIMEOUT_MS || 10 * 60 * 1000);
let resolvedYtDlpPath;
let loggedJsRuntime;
function canRun(binaryPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield execFileAsync(binaryPath, ['--version'], {
                timeout: 15000,
                maxBuffer: 1024 * 1024,
            });
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
function findOnPath(binary) {
    const pathValue = process.env.PATH || '';
    const extensions = process.platform === 'win32' && !path_1.default.extname(binary)
        ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';')
        : [''];
    for (const directory of pathValue.split(path_1.default.delimiter)) {
        if (!directory)
            continue;
        for (const extension of extensions) {
            const candidate = path_1.default.join(directory, `${binary}${extension}`);
            if (fs_1.default.existsSync(candidate)) {
                return candidate;
            }
        }
    }
    return undefined;
}
function getYtDlpJsRuntime() {
    if (process.env.YT_DLP_JS_RUNTIME) {
        return process.env.YT_DLP_JS_RUNTIME;
    }
    const denoPath = process.env.DENO_PATH ||
        (fs_1.default.existsSync(localDenoPath) ? localDenoPath : undefined) ||
        findOnPath(denoName);
    if (denoPath) {
        return `deno:${denoPath}`;
    }
    const nodeMajorVersion = Number(process.versions.node.split('.')[0]);
    if (nodeMajorVersion < 22) {
        console.warn(`yt-dlp may require Deno or Node 22+ for YouTube extraction. Current Node is ${process.version}.`);
    }
    return `node:${process.execPath}`;
}
function logYtDlpJsRuntime(runtime) {
    if (loggedJsRuntime === runtime)
        return;
    console.log(`Using yt-dlp JavaScript runtime: ${runtime}`);
    loggedJsRuntime = runtime;
}
function getYtDlpRuntimeArgs() {
    const jsRuntime = getYtDlpJsRuntime();
    const args = ['--js-runtimes', jsRuntime];
    logYtDlpJsRuntime(jsRuntime);
    if (process.env.YT_DLP_COOKIES) {
        args.push('--cookies', process.env.YT_DLP_COOKIES);
    }
    if (process.env.YT_DLP_PROXY) {
        args.push('--proxy', process.env.YT_DLP_PROXY);
    }
    return args;
}
exports.getYtDlpRuntimeArgs = getYtDlpRuntimeArgs;
function resolveYtDlpPath() {
    return __awaiter(this, void 0, void 0, function* () {
        if (resolvedYtDlpPath) {
            return resolvedYtDlpPath;
        }
        const candidates = [
            process.env.YT_DLP_PATH,
            fs_1.default.existsSync(localYtDlpPath) ? localYtDlpPath : undefined,
            'yt-dlp',
        ].filter(Boolean);
        for (const candidate of candidates) {
            if (yield canRun(candidate)) {
                resolvedYtDlpPath = candidate;
                return candidate;
            }
        }
        throw new Error('yt-dlp was not found. Run "npm run install:ytdlp" or set YT_DLP_PATH to the yt-dlp binary.');
    });
}
exports.resolveYtDlpPath = resolveYtDlpPath;
function runYtDlp(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const binaryPath = yield resolveYtDlpPath();
        try {
            yield execFileAsync(binaryPath, args, {
                timeout: timeoutMs,
                maxBuffer: 20 * 1024 * 1024,
            });
        }
        catch (error) {
            const failure = error;
            const details = [failure.stderr, failure.stdout, failure.message]
                .filter(Boolean)
                .join('\n')
                .trim();
            throw new Error(`yt-dlp failed: ${details}`);
        }
    });
}
exports.runYtDlp = runYtDlp;
