import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('CI runs the API health E2E suite', async () => {
  const [workflow, e2eSpec] = await Promise.all([
    readFile(path.join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8'),
    readFile(path.join(repositoryRoot, 'apps/api/test/health.e2e-spec.ts'), 'utf8'),
  ]);

  assert.match(workflow, /pnpm --filter @comandinha\/api test:e2e/);
  assert.match(e2eSpec, /keeps liveness available while the database check fails/);
});
