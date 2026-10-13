import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { startLocalDevelopment } from './dev.mjs';

test('passes local application environment only to dev tasks', () => {
  const turboConfig = JSON.parse(
    readFileSync(new URL('../turbo.json', import.meta.url), 'utf8'),
  );
  const requiredDevEnvironment = [
    'API_PORT',
    'DATABASE_URL',
    'API_INTERNAL_URL',
    'APP_ORIGIN',
    'AUTH_GATEWAY_SECRET',
    'TRUSTED_CLIENT_IP_HEADER',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_WEBSOCKET_URL',
    'NEXT_PUBLIC_USE_MOCK',
  ];
  const devOnlyEnvironment = requiredDevEnvironment.filter((name) => name !== 'DATABASE_URL');

  assert.deepEqual(
    requiredDevEnvironment.filter((name) => !turboConfig.tasks.dev.passThroughEnv?.includes(name)),
    [],
  );
  const globallyExposedEnvironment = [
    ...(turboConfig.globalEnv ?? []),
    ...(turboConfig.globalPassThroughEnv ?? []),
  ];
  const otherTaskEnvironment = Object.entries(turboConfig.tasks)
    .filter(([taskName]) => taskName !== 'dev' && taskName !== '@comandinha/api#typecheck')
    .flatMap(([, task]) => [...(task.env ?? []), ...(task.passThroughEnv ?? [])]);

  assert.equal(
    devOnlyEnvironment.some((name) =>
      [...globallyExposedEnvironment, ...otherTaskEnvironment].includes(name),
    ),
    false,
  );
  assert.equal(globallyExposedEnvironment.includes('DATABASE_URL'), false);
  assert.equal(
    turboConfig.tasks['@comandinha/api#typecheck']?.passThroughEnv?.includes('DATABASE_URL'),
    true,
  );
});

function createChild() {
  return Object.assign(new EventEmitter(), {
    kill: () => true,
  });
}

test('waits for Compose health before starting Turbo', async () => {
  const compose = createChild();
  const turbo = createChild();
  const children = [compose, turbo];
  const commands = [];
  const spawnProcess = (command, args, options) => {
    commands.push({ command, args, options });
    return children[commands.length - 1];
  };
  const signals = new EventEmitter();
  const startup = startLocalDevelopment({ spawnProcess, cwd: 'C:/comandinha', signalTarget: signals });

  assert.equal(commands.length, 1);
  assert.equal(commands[0].command, 'docker');
  assert.deepEqual(commands[0].args, ['compose', 'up', '--detach', '--wait', 'postgres']);
  assert.equal(commands[0].options.cwd, 'C:/comandinha');

  compose.emit('exit', 0, null);
  await Promise.resolve();

  assert.equal(commands.length, 2);
  assert.deepEqual(commands[1].args.slice(-2), ['run', 'dev']);
  turbo.emit('exit', 0, null);
  assert.equal(await startup, 0);
});

test('does not start Turbo when Compose fails its health wait', async () => {
  const compose = createChild();
  const commands = [];
  const startup = startLocalDevelopment({
    spawnProcess(command, args) {
      commands.push({ command, args });
      return compose;
    },
    cwd: 'C:/comandinha',
    signalTarget: new EventEmitter(),
  });

  compose.emit('exit', 1, null);
  await assert.rejects(startup, /PostgreSQL did not become healthy/);
  assert.equal(commands.length, 1);
});

test('forwards termination signals to the running Turbo process', async () => {
  const compose = createChild();
  const turbo = Object.assign(createChild(), { signal: null });
  turbo.kill = (signal) => {
    turbo.signal = signal;
    return true;
  };
  const children = [compose, turbo];
  const signals = new EventEmitter();
  const startup = startLocalDevelopment({
    spawnProcess: () => children.shift(),
    cwd: 'C:/comandinha',
    signalTarget: signals,
  });

  compose.emit('exit', 0, null);
  await Promise.resolve();
  signals.emit('SIGINT', 'SIGINT');

  assert.equal(turbo.signal, 'SIGINT');
  turbo.emit('exit', 130, 'SIGINT');
  assert.equal(await startup, 130);
});
