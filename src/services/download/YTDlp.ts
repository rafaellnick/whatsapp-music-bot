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

export function getYtDlpRuntimeArgs(): string[] {
  const args: string[] = [];

  if (process.env.YT_DLP_COOKIES) {
    args.push('--cookies', process.env.YT_DLP_COOKIES);
  }

  if (process.env.YT_DLP_PROXY) {
    args.push('--proxy', process.env.YT_DLP_PROXY);
  }

  if (process.env.YT_DLP_JS_RUNTIME) {
    args.push('--js-runtimes', process.env.YT_DLP_JS_RUNTIME);
  } else if (process.env.DENO_PATH) {
    args.push('--js-runtimes', `deno:${process.env.DENO_PATH}`);
  } else if (fs.existsSync(localDenoPath)) {
    args.push('--js-runtimes', `deno:${localDenoPath}`);
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
