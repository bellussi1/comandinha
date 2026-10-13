import { describe, expect, it } from 'vitest';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('reports the API process as live', () => {
    expect(new HealthService().live()).toEqual({ status: 'ok' });
  });
});
