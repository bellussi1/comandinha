import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReadme } from './check-readme.mjs';

const completeReadme = `
## Estado do projeto
Somente fundação.
## Stack
Next.js and NestJS.
## Pré-requisitos
Node and Docker.
## Desenvolvimento local
Run pnpm dev.
## Serviços e URLs
Web and API.
## Comandos
pnpm test.
## Variáveis de ambiente
DATABASE_URL.
## Limitações atuais
Orders are not implemented.
`;

test('accepts a README that covers every required foundation topic', () => {
  assert.deepEqual(validateReadme(completeReadme), []);
});

test('reports each missing required section by heading', () => {
  const issues = validateReadme('## Estado do projeto\nSomente fundação.\n');

  assert.deepEqual(issues, [
    'Missing required section: Stack',
    'Missing required section: Pré-requisitos',
    'Missing required section: Desenvolvimento local',
    'Missing required section: Serviços e URLs',
    'Missing required section: Comandos',
    'Missing required section: Variáveis de ambiente',
    'Missing required section: Limitações atuais',
  ]);
});
