import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { configureOpenApi } from '../src/openapi.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(apiRoot, 'openapi.json');
const app = await NestFactory.create(AppModule, { logger: false });

try {
  const document = configureOpenApi(app);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
} finally {
  await app.close();
}
