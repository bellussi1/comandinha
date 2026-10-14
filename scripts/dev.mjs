import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const turboCli = resolve(repositoryRoot, 'node_modules/turbo/bin/turbo');

function waitForExit(child) {
  return new Promise((resolveExit, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };

    child.once('error', (error) => finish(reject, error));
    child.once('exit', (code, signal) => finish(resolveExit, { code, signal }));
  });
}

export async function startLocalDevelopment({
  spawnProcess = spawn,
  cwd = repositoryRoot,
  signalTarget = process,
} = {}) {
  let activeChild;
  const forwardSignal = (signal) => activeChild?.kill(signal);

  signalTarget.on('SIGINT', forwardSignal);
  signalTarget.on('SIGTERM', forwardSignal);

  try {
    activeChild = spawnProcess(
      'docker',
      ['compose', 'up', '--detach', '--wait', 'postgres'],
      { cwd, stdio: 'inherit', windowsHide: true },
    );
    const composeResult = await waitForExit(activeChild);

    if (composeResult.code !== 0) {
      throw new Error(
        `PostgreSQL did not become healthy (docker compose exited with ${composeResult.code ?? composeResult.signal}).`,
      );
    }

    activeChild = spawnProcess(
      process.execPath,
      [turboCli, 'run', 'dev'],
      { cwd, stdio: 'inherit', windowsHide: true },
    );

    const turboResult = await waitForExit(activeChild);
    return turboResult.code ?? (turboResult.signal === 'SIGINT' ? 130 : 1);
  } finally {
    signalTarget.removeListener('SIGINT', forwardSignal);
    signalTarget.removeListener('SIGTERM', forwardSignal);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startLocalDevelopment()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
