import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const requiredSections = [
  'Estado do projeto',
  'Stack',
  'Pré-requisitos',
  'Desenvolvimento local',
  'Serviços e URLs',
  'Comandos',
  'Variáveis de ambiente',
  'Limitações atuais',
];

export function validateReadme(markdown) {
  return requiredSections
    .filter((title) => !new RegExp(`^#{1,6}\\s+${title}\\s*#?\\s*$`, 'mi').test(markdown))
    .map((title) => `Missing required section: ${title}`);
}

async function main() {
  const readmePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'README.md');
  const issues = validateReadme(await readFile(readmePath, 'utf8'));

  if (issues.length > 0) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
    return;
  }

  console.log(`README checklist passed: ${requiredSections.length} required sections found.`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
