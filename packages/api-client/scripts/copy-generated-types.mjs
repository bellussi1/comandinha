import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(packageRoot, 'src/generated/schema.d.ts');
const destinationPath = resolve(packageRoot, 'dist/generated/schema.d.ts');

await mkdir(dirname(destinationPath), { recursive: true });
await copyFile(sourcePath, destinationPath);
