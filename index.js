import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetScript = path.join(__dirname, 'src', 'index.ts');
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);

const tsxCli = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
let execArgs = [];

if (fs.existsSync(tsxCli)) {
  // Use tsx for universal TypeScript execution across any Node.js version (18, 19, 20, 22, 24)
  execArgs = [tsxCli, targetScript];
} else if (nodeMajor >= 22) {
  // Fallback to native Node 22+ type stripping
  execArgs = ['--experimental-strip-types', targetScript];
} else {
  console.error('[Error] Node version is below 22 and tsx is not installed. Please upgrade Node to 22/24 or run npm install.');
  process.exit(1);
}

const child = spawn(process.execPath, execArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

