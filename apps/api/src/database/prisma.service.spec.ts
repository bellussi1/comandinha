import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  let service: PrismaService | undefined;

  afterEach(async () => {
    await service?.onModuleDestroy();
    service = undefined;
    vi.restoreAllMocks();
  });

  it('reports a successful SELECT 1 query as available', async () => {
    service = new PrismaService();
    vi.spyOn(service, '$queryRaw').mockResolvedValue([] as never);

    await expect(service.checkConnection()).resolves.toBe(true);
  });

  it('reports a failed database query as unavailable', async () => {
    service = new PrismaService();
    vi.spyOn(service, '$queryRaw').mockRejectedValue(new Error('connection refused'));

    await expect(service.checkConnection()).resolves.toBe(false);
  });
});
