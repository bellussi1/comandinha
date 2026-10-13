import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureOpenApi } from '../src/openapi.js';

describe('GET /health/live', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureOpenApi(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns HTTP 200 and the exact liveness response', async () => {
    const response = await fetch(new URL('/health/live', baseUrl));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('publishes liveness in the OpenAPI document', async () => {
    const response = await fetch(new URL('/openapi.json', baseUrl));
    const document = await response.json();

    expect(response.status).toBe(200);
    expect(document.info).toMatchObject({
      title: 'Comandinha API',
      version: '1.0.0',
    });
    expect(document.paths['/health/live'].get.responses['200']).toBeDefined();
  });
});
