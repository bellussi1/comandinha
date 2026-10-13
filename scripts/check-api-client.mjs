import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiSpecPath = resolve(repositoryRoot, 'apps/api/openapi.json');
const apiClientPackagePath = resolve(repositoryRoot, 'packages/api-client/package.json');
const clientRequire = createRequire(apiClientPackagePath);
const openapiTypescriptEntry = clientRequire.resolve('openapi-typescript');
const openapiTypescriptModule = await import(pathToFileURL(openapiTypescriptEntry).href);
const openapiTS = openapiTypescriptModule.default?.default ?? openapiTypescriptModule.default;
const astToString = openapiTypescriptModule.astToString;
const commentHeader = openapiTypescriptModule.COMMENT_HEADER;

export async function assertGeneratedMatches(generatedPath, checkedInPath) {
  const [generated, checkedIn] = await Promise.all([
    readFile(generatedPath, 'utf8'),
    readFile(checkedInPath, 'utf8'),
  ]);

  if (generated !== checkedIn) {
    throw new Error(`${checkedInPath} is not up to date. Run pnpm api:client:generate.`);
  }
}

async function checkApiClient() {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'comandinha-api-client-'));
  const generatedSpecPath = resolve(temporaryDirectory, 'openapi.json');
  const generatedTypesPath = resolve(temporaryDirectory, 'schema.d.ts');
  const exportScript = resolve(repositoryRoot, 'apps/api/scripts/export-openapi.ts');

  try {
    const exportResult = spawnSync(
      process.execPath,
      ['--import', 'tsx', exportScript, generatedSpecPath],
      { cwd: resolve(repositoryRoot, 'apps/api'), encoding: 'utf8' },
    );

    if (exportResult.stdout) process.stdout.write(exportResult.stdout);
    if (exportResult.stderr) process.stderr.write(exportResult.stderr);
    if (exportResult.error) throw exportResult.error;
    if (exportResult.status !== 0) {
      throw new Error(`OpenAPI export exited with status ${exportResult.status}.`);
    }

    await assertGeneratedMatches(generatedSpecPath, apiSpecPath);

    const generatedTypes = `${commentHeader}${astToString(
      await openapiTS(pathToFileURL(generatedSpecPath)),
    )}`;
    await writeFile(generatedTypesPath, generatedTypes, 'utf8');
    await assertGeneratedMatches(
      generatedTypesPath,
      resolve(repositoryRoot, 'packages/api-client/src/generated/schema.d.ts'),
    );

    console.log('OpenAPI document and generated API client types are up to date.');
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkApiClient().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
