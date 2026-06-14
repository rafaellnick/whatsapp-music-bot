import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(__dirname, '../../..');
const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const denoName = process.platform === 'win32' ? 'deno.exe' : 'deno';
const localYtDlpPath = path.join(projectRoot, 'bin', binaryName);
const localDenoPath = path.join(projectRoot, 'bin', denoName);
const timeoutMs = Number(process.env.YT_DLP_TIMEOUT_MS || 10 * 60 * 1000);

let resolvedYtDlpPath: string | undefined;
let loggedJsRuntime: string | undefined;

type ExecFileFailure = Error & {
  code?: string | number;
  stderr?: string;
  stdout?: string;
};

async function canRun(binaryPath: string): Promise<boolean> {
  try {
    await execFileAsync(binaryPath, ['--version'], {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    return true;
  } catch {
    return false;
  }
}

function findOnPath(binary: string): string | undefined {
  const pathValue = process.env.PATH || '';
  const extensions =
    process.platform === 'win32' && !path.extname(binary)
      ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';')
      : [''];

  for (const directory of pathValue.split(path.delimiter)) {
    if (!directory) continue;

    for (const extension of extensions) {
      const candidate = path.join(directory, `${binary}${extension}`);

      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

function getYtDlpJsRuntime(): string {
  if (process.env.YT_DLP_JS_RUNTIME) {
    return process.env.YT_DLP_JS_RUNTIME;
  }

  const denoPath =
    process.env.DENO_PATH ||
    (fs.existsSync(localDenoPath) ? localDenoPath : undefined) ||
    findOnPath(denoName);

  if (denoPath) {
    return `deno:${denoPath}`;
  }

  const nodeMajorVersion = Number(process.versions.node.split('.')[0]);

  if (nodeMajorVersion < 22) {
    console.warn(
      `yt-dlp may require Deno or Node 22+ for YouTube extraction. Current Node is ${process.version}.`,
    );
  }

  return `node:${process.execPath}`;
}

function logYtDlpJsRuntime(runtime: string): void {
  if (loggedJsRuntime === runtime) return;

  console.log(`Using yt-dlp JavaScript runtime: ${runtime}`);
  loggedJsRuntime = runtime;
}

export function getYtDlpRuntimeArgs(): string[] {
  const jsRuntime = getYtDlpJsRuntime();
  const args: string[] = ['--js-runtimes', jsRuntime];

  logYtDlpJsRuntime(jsRuntime);

  if (process.env.YT_DLP_COOKIES) {
    args.push('--cookies', process.env.YT_DLP_COOKIES);
  }

  if (process.env.YT_DLP_PROXY) {
    args.push('--proxy', process.env.YT_DLP_PROXY);
  }

  return args;
}

export async function resolveYtDlpPath(): Promise<string> {
  if (resolvedYtDlpPath) {
    return resolvedYtDlpPath;
  }

  const candidates = [
    process.env.YT_DLP_PATH,
    fs.existsSync(localYtDlpPath) ? localYtDlpPath : undefined,
    'yt-dlp',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (await canRun(candidate)) {
      resolvedYtDlpPath = candidate;
      return candidate;
    }
  }

  throw new Error(
    'yt-dlp was not found. Run "npm run install:ytdlp" or set YT_DLP_PATH to the yt-dlp binary.',
  );
}

export async function runYtDlp(args: string[]): Promise<void> {
  const binaryPath = await resolveYtDlpPath();

  try {
    await execFileAsync(binaryPath, args, {
      timeout: timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    const failure = error as ExecFileFailure;
    const details = [failure.stderr, failure.stdout, failure.message]
      .filter(Boolean)
      .join('\n')
      .trim();

    throw new Error(`yt-dlp failed: ${details}`);
  }
}
