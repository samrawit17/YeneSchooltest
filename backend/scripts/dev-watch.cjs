const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = path.resolve(__dirname, '..');
const distMain = path.join(cwd, 'dist', 'main.js');
const tsBuildInfo = path.join(cwd, 'tsconfig.build.tsbuildinfo');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

let compiler = null;
let runtime = null;
let shuttingDown = false;

function spawnProcess(command, args) {
  return spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
}

function cleanupAndExit(code = 0) {
  shuttingDown = true;

  if (runtime && !runtime.killed) {
    runtime.kill('SIGTERM');
  }

  if (compiler && !compiler.killed) {
    compiler.kill('SIGTERM');
  }

  process.exit(code);
}

function clearIncrementalState() {
  if (fs.existsSync(tsBuildInfo)) {
    fs.rmSync(tsBuildInfo, { force: true });
  }
}

function clearStaleEntryPoint() {
  if (fs.existsSync(distMain)) {
    fs.rmSync(distMain, { force: true });
  }
}

function runBuild(args, onExit) {
  const build = spawnProcess(npxCmd, args);
  build.on('exit', onExit);
}

function startRuntimeWhenReady() {
  if (runtime || !fs.existsSync(distMain)) {
    return;
  }

  runtime = spawnProcess(process.execPath, ['--watch', distMain]);
  runtime.on('exit', (code) => {
    if (shuttingDown) {
      process.exit(code ?? 0);
      return;
    }
    runtime = null;
  });
}

function startCompiler() {
  compiler = spawnProcess(npxCmd, [
    'tsc',
    '-p',
    'tsconfig.build.json',
    '-w',
    '--preserveWatchOutput',
  ]);

  compiler.on('exit', (code) => {
    if (!shuttingDown) {
      cleanupAndExit(code ?? 1);
    }
  });
}

const prismaGenerate = spawnProcess(npmCmd, ['run', 'prisma:generate']);

prismaGenerate.on('exit', (code) => {
  if (code !== 0) {
    cleanupAndExit(code ?? 1);
    return;
  }

  clearIncrementalState();
  clearStaleEntryPoint();

  runBuild(['tsc', '-p', 'tsconfig.build.json'], (buildCode) => {
    if (buildCode !== 0) {
      cleanupAndExit(buildCode ?? 1);
      return;
    }

    if (!fs.existsSync(distMain)) {
      clearIncrementalState();
      runBuild(
        ['tsc', '-p', 'tsconfig.build.json', '--incremental', 'false'],
        (retryCode) => {
          if (retryCode !== 0 || !fs.existsSync(distMain)) {
            cleanupAndExit(retryCode ?? 1);
            return;
          }

          startRuntimeWhenReady();
          startCompiler();
        },
      );
      return;
    }

    startRuntimeWhenReady();
    startCompiler();
  });
});

process.on('SIGINT', () => cleanupAndExit(0));
process.on('SIGTERM', () => cleanupAndExit(0));
