import { describe, expect, it } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const createService = (checkConnection: () => Promise<boolean>) =>
    new HealthService({ checkConnection } as unknown as PrismaService);

  it('reports the API process as live', () => {
    expect(createService(async () => false).live()).toEqual({ status: 'ok' });
  });

  it('reports database availability for readiness', async () => {
    await expect(createService(async () => true).ready()).resolves.toBe(true);
    await expect(createService(async () => false).ready()).resolves.toBe(false);
  });
});
