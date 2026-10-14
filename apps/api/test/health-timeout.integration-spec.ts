import { createServer } from 'node:net';
import { once } from 'node:events';
import type { Socket } from 'node:net';
import { expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service.js';

it('returns not-ready within the PostgreSQL timeout when a server stops responding', async () => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const originalDatabaseUrl = process.env.DATABASE_URL;
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP server address.');

  process.env.DATABASE_URL =
    `postgresql://comandinha:unused@127.0.0.1:${address.port}/unresponsive?schema=public`;
  const prisma = new PrismaService();
  const check = prisma.checkConnection();
  let deadlineTimer: NodeJS.Timeout | undefined;
  const deadline = new Promise<undefined>((resolve) => {
    deadlineTimer = setTimeout(() => resolve(undefined), 3_000);
  });

  let result: boolean | undefined;

  try {
    result = await Promise.race([check, deadline]);
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await check;
    await prisma.$disconnect();

    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }

  expect(result).toBe(false);
});
