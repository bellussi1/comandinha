import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertGeneratedMatches } from './check-api-client.mjs';

async function withGeneratedFiles(generated, checkedIn, run) {
  const directory = await mkdtemp(join(tmpdir(), 'comandinha-api-client-'));
  const generatedPath = join(directory, 'generated.d.ts');
  const checkedInPath = join(directory, 'checked-in.d.ts');

  try {
    await writeFile(generatedPath, generated);
    await writeFile(checkedInPath, checkedIn);
    await run(generatedPath, checkedInPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('accepts identical generated and checked-in types', async () => {
  const contents = 'export interface paths {}\n';

  await withGeneratedFiles(contents, contents, async (generatedPath, checkedInPath) => {
    await assertGeneratedMatches(generatedPath, checkedInPath);
  });
});

test('rejects stale checked-in types', async () => {
  await withGeneratedFiles('export interface paths {}\n', 'export interface paths { old: never }\n', async (generatedPath, checkedInPath) => {
    await assert.rejects(assertGeneratedMatches(generatedPath, checkedInPath), /not up to date/);
  });
});
