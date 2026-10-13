# Comandinha — especificação de modernização fullstack

**Status:** aprovada para implementação local incremental pelo usuário em 13 de outubro de 2026. A aprovação cobre o escopo técnico descrito; não autoriza publicação, deploy ou provisionamento cloud.

## Objetivo

Modernizar o Comandinha como projeto de portfólio que demonstre engenharia fullstack com decisões proporcionais ao produto: modelagem relacional, segurança, isolamento entre restaurantes, contratos de API, testes, execução local reproduzível e documentação técnica.

O MVP deve demonstrar o ciclo QR Code → cardápio → carrinho → pedido → cozinha/administração → fechamento da mesa. A prioridade é corrigir os limites de autorização e consistência antes de adicionar funcionalidades. Não serão declaradas métricas, produção, escala ou resultados sem evidência.

## Contexto auditado

A auditoria estática foi feita em 12 de outubro de 2026, nas cópias locais dos seguintes estados:

- Frontend bellussi1/comandinha, branch master, commit d95a617.
- Backend thiagombrs/comandinha-backend, branch main, commit 501b028.

O frontend declara Next.js 15.0.2, um React 19 release candidate, Tailwind CSS 3.4 e componentes Radix/shadcn, além de Axios e Jest. O backend declara FastAPI na faixa 0.113.x, SQLAlchemy 1.4.41, Alembic 1.13.1, Pydantic 2 e Uvicorn. O banco é PostgreSQL ou SQLite, conforme configuração.

Achados relevantes:

- A assinatura e validação de JWT usam uma chave fixa no código.
- O endpoint /auth/refresh renova um access token usando o próprio access token válido; não há uma credencial de renovação separada ou revogação de sessão.
- O cadastro público cria uma conta administrativa, e as entidades de operação não têm vínculo com restaurante.
- A listagem de pedidos de produção, o detalhe de pedido e a listagem de pedidos por mesa não aplicam autorização administrativa ou sessão de mesa.
- Next.js 15.0.2 está abaixo das versões corrigidas para vulnerabilidades críticas de React Server Components. A auditoria read-only do lockfile encontrou 11 vulnerabilidades em dependências de produção: duas críticas, sete altas e duas moderadas.
- A validação do pedido não restringe quantidade positiva nem lista vazia. A criação do pedido e a atualização da mesa usam commits separados.
- O proxy de imagens valida hostname por substring antes de buscar URL fornecida pelo cliente.
- Há divergências entre serviços do frontend e rotas do backend, incluindo ativação de mesa e upload de imagem.
- O backend versiona bytecode e um banco SQLite. Seu conteúdo não foi aberto.
- O README do frontend menciona MIT, mas não há arquivo LICENSE. O backend não declara licença.
- Não há testes encontrados no backend; o frontend tem testes unitários, sem suite E2E encontrada.

A auditoria foi estática. Não foram instaladas dependências, rodados testes da aplicação, feitas alterações nos repositórios de origem, nem consultados dados do banco versionado.

## Princípios e limites

- Não modificar as branches principais dos repositórios de origem.
- Não reutilizar nem republicar código do backend de terceiros sem licença ou autorização verificável. Tratar seu comportamento como referência; enquanto a licença não estiver esclarecida, implementar a API nova de forma independente.
- Não executar deploy, publicação, provisionamento cloud, Terraform apply ou equivalente.
- Não inserir segredos reais. Registrar exemplos apenas em arquivos de ambiente de exemplo.
- Não migrar ou apagar dados sem inventário, autorização, backup, plano de recuperação e validação.
- Manter um monólito modular. Não adicionar microsserviços, Kubernetes, Redis ou filas sem requisito demonstrável.
- Preservar no frontend fluxos úteis e confirmados; distinguir fluxo implementado, parcial, documentado e proposto.
- Não afirmar ganho de performance sem medição comparável.

## Alternativas avaliadas

### A. Manter Next.js e FastAPI em repositórios separados

Preserva a organização e reduz mudanças imediatas. Continua exigindo coordenação de contratos, documentação, CI e execução local entre dois repositórios. É adequada se a separação de ciclos de publicação for um requisito.

### B. Monorepo Next.js e FastAPI

Reúne documentação, Compose e CI sem reescrever imediatamente a API. Preserva uma implementação de referência útil, mas mantém duas toolchains e não atende à preferência de consolidar a stack em TypeScript.

### C. Monorepo Next.js e NestJS — escolhida

Consolida a linguagem, compartilha configurações TypeScript e permite gerar o cliente da API a partir de OpenAPI. O custo é reimplementar a API e revalidar regras de negócio, autenticação e consistência; por isso a migração será incremental e coberta por testes. Essa é a direção selecionada pelo usuário.

O backend de origem não declara licença. Ele será referência para fluxos e regras observáveis; a API NestJS será implementada de forma independente até haver licença ou autorização verificável para reutilizar código.

## Decisões propostas

### Monorepo e execução local

Usar pnpm workspaces 12.11.2 e Turborepo 2.11.7, versões estáveis consultadas em 12/10/2026, para o app web, API NestJS e pacotes TypeScript. O lockfile pnpm será único na raiz. O Turborepo coordenará lint, typecheck, testes, geração OpenAPI e builds, com cache apenas de tarefas determinísticas.

Estrutura inicial:

- apps/web — Next.js App Router.
- apps/api — NestJS modular, Prisma e PostgreSQL.
- packages/api-client — cliente TypeScript gerado a partir da especificação OpenAPI da API.
- packages/eslint-config e packages/typescript-config — somente se web e cliente realmente compartilharem essas configurações.
- infra/docker — Dockerfiles e configuração local, ou arquivos equivalentes na raiz se Compose ficar mais simples de descobrir.
- docs/architecture, docs/adr, docs/api e docs/diagrams — decisões, contrato e documentação.
- pnpm-workspace.yaml, turbo.json e compose.yaml — workspace, tarefas e execução local.

Não criar pacote shared genérico nem uma biblioteca de componentes compartilhada sem consumidores e responsabilidades definidos. Componentes de UI permanecem em apps/web.

Docker Compose deve iniciar web, API e PostgreSQL com um comando documentado, usando variáveis de ambiente de exemplo e dados de demonstração reproduzíveis. CI instala a toolchain Node, inicia PostgreSQL para integração e valida todos os pacotes do workspace.

### Frameworks e versões

Usar Next.js 16.4.0 com React e React DOM 19.3.0, versões estáveis verificadas em 12/10/2026 nos metadados oficiais de pacotes. Manter App Router e TypeScript strict. Revalidar versões estáveis e avisos de segurança ao iniciar a implementação; fixar versões no lockfile e atualizar por PRs revisáveis.

Usar Node.js 24.21.0 LTS, versão atual dessa linha em 12/10/2026; Node 26 ainda está no canal Current. O Next 16 requer Node >=20.9 e o CLI de NestJS 12 requer Node >=24.15 para gerar projetos e executar schematics; a máquina auditada tinha Node 24.13.0, portanto deve ser atualizada antes da fundação. NestJS 12 publica pacotes ESM; iniciar o app em ESM e manter os pacotes @nestjs/* na mesma major.

Usar NestJS 12.1.3, @nestjs/cli 12.0.8 e @nestjs/swagger 12.0.2, versões estáveis consultadas em 12/10/2026. Usar TypeScript 6.0.3, a versão estável mais recente da major aceita pelo @nestjs/swagger 12; manter strict. Usar Vitest 5.0.4 para testes da API Nest em ESM e Playwright 1.64.0 para E2E. Revisar a configuração webpack extensa do frontend e testar o Turbopack padrão do Next 16; consolidar next.config.js e next.config.mjs e substituir next lint pela execução direta de ESLint. Ativar Cache Components apenas depois de testar cache, revalidação e estados dinâmicos das rotas.

Usar as versões estáveis mais recentes de Next.js, React e NestJS que permaneçam compatíveis e corrigidas por segurança. As versões acima são um retrato dos metadados em 12/10/2026, não uma promessa de que continuarão sendo as últimas quando a implementação começar. Docker Compose oferece o ambiente local; seeds e dados de demonstração devem ser gerados explicitamente, sem SQLite versionado.

### Banco e persistência

Adotar PostgreSQL 18, linha suportada e estável na data desta revisão, atualizando para o último minor disponível.

Usar Prisma ORM, @prisma/client e @prisma/adapter-pg 7.10.0, última versão estável da linha 7 consultada. Em 12/10/2026, Prisma 8 ainda é release candidate e o dist-tag `latest` do CLI aponta para uma versão RC; fixar explicitamente Prisma 7 e reavaliar Prisma 8 após sua disponibilidade geral e validação dos recursos necessários. Prisma oferece schema declarativo, client tipado, migrations reproduzíveis e transações para o MVP. Drizzle é alternativa caso se prefira schema e queries mais próximos de SQL; não há benchmark que justifique trocar por desempenho antes de medir. Confirmar a matriz de compatibilidade com NestJS 12, Node 24 e PostgreSQL 18 antes de fixar a implementação.

### API, contrato e BFF

Usar REST com OpenAPI como fonte de verdade. Validar entradas no servidor com ValidationPipe, class-validator 0.15.1 e class-transformer 0.5.1; nunca confiar na validação de formulário do navegador. NestJS publica o schema via @nestjs/swagger. Gerar o cliente TypeScript em packages/api-client com openapi-typescript 7.13.0 e openapi-fetch 0.17.0, versões consultadas em 12/10/2026. Validar em CI que o artefato está atualizado; não manter DTOs equivalentes manualmente no frontend e na API.

Não criar serviço BFF independente. Usar Route Handlers do Next como gateway same-origin limitado à sessão e ao proxy das chamadas do navegador. Os handlers não carregam regras de negócio: NestJS continua sendo a autoridade de autenticação, autorização e domínio. Não expor credenciais administrativas a JavaScript do navegador.

### Identidade, sessão e multi-tenancy

Separar usuários, restaurantes e memberships. Uma identidade pode pertencer a um ou mais restaurantes, com papel explícito por membership. O tenant ativo é determinado pela sessão validada; nunca se confia em restaurant_id fornecido pelo cliente.

As tabelas de domínio carregam restaurant_id, com índices, unicidades e relações compostas adequadas. Queries e mutations são sempre escopadas pelo tenant autenticado. O plano de testes inclui tentativas de leitura, alteração e exclusão cruzadas entre dois restaurantes.

Para administração, preferir sessão opaca com validade e revogação no PostgreSQL, entregue em cookie HttpOnly, Secure e SameSite. A camada Next encaminha a sessão ao NestJS; mutações verificam origem e proteção CSRF apropriada. Para clientes de mesa, usar sessão limitada à mesa e ao restaurante, revogável no fechamento; QR Code não concede permissões administrativas. Aplicar limites de requisição ao login, chamadas e criação de pedidos.

RLS no PostgreSQL pode ser avaliada como defesa adicional depois que o escopo da aplicação estiver coberto por testes. Não será a única barreira de tenant.

### Domínio e consistência

Os módulos de domínio iniciais são restaurantes/memberships, autenticação, cardápio, mesas/sessões, pedidos, chamados e fechamento.

O servidor recalcula totais. Preços persistidos usam centavos inteiros ou NUMERIC/Decimal, não Float. Cada item registra snapshot de nome, preço unitário e adicionais no momento do pedido. A criação valida disponibilidade, quantidade, restaurante e sessão da mesa.

Criar pedido, itens e mudança de estado da mesa dentro de uma transação. Requisições repetidas usam chave de idempotência. Estados permitidos são explícitos e cada alteração gera histórico. O fechamento persiste data, método informado e pedidos fechados atomicamente. Não haverá processamento de pagamento nesta etapa.

Manter polling no início, com intervalos e consultas medidos. Avaliar SSE se o fluxo da cozinha demonstrar necessidade de menor latência. Não adicionar WebSocket sem necessidade bidirecional.

### Interface e bibliotecas visuais

Usar Tailwind CSS 4.3.3, versão estável consultada em 12/10/2026, após conferir os navegadores-alvo: a versão 4 requer Safari 16.4+, Chrome 111+ e Firefox 128+. Preservar a identidade do Comandinha com tokens próprios, contraste, estados claros e componentes responsivos; Tailwind fornece utilitários de estilo, não uma aparência pronta.

Adotar o CLI shadcn 4.21.4 para adicionar código-fonte de componentes acessíveis e customizáveis dentro de apps/web; shadcn não é uma biblioteca fechada de runtime. Para componentes novos, usar a base @base-ui/react 1.9.0, opção padrão do shadcn em projetos novos na data desta revisão. Radix continua suportado; componentes existentes podem ser migrados por fluxo, sem misturar primitives dentro do mesmo componente.

Usar lucide-react 1.55.0 para ícones. Para formulários administrativos complexos, usar React Hook Form 7.90.0 com Zod 4.6.7 e @hookform/resolvers 5.9.1; formulários simples podem usar validação nativa. A validação no cliente melhora feedback, mas NestJS sempre valida dados no servidor. Atualizar Sonner para 2.0.8 se o inventário confirmar que permanece necessário para notificações.

Priorizar transições CSS curtas, skeletons e feedback de ações. Para animações de entrada/saída ou gestos que CSS não resolva bem, usar Motion 14.1.0 de forma pontual e respeitar prefers-reduced-motion; não adicionar efeitos extensos de scroll por padrão. Substituir tailwindcss-animate depreciado por tw-animate-css quando as animações existentes forem migradas. Revisar dependências duplicadas, incluindo Radix Toast se já houver substituição completa por Sonner. Manter componentes em apps/web; criar packages/ui somente quando houver outro consumidor real.

### Migração

A migração não é um corte único para produção. O backend atual não tem licença declarada e o banco SQLite versionado não foi inspecionado; qualquer migração de código ou dados exige autorização e inventário separados.

Fases propostas:

1. Fundação: branch de trabalho, monorepo pnpm/Turbo, Node LTS, Compose com PostgreSQL, configurações compartilhadas, CI e documentação local.
2. Modelo e autenticação: schema Prisma novo, migrations revisáveis, usuários/memberships/tenant, sessões, políticas de acesso e testes de isolamento. Reimplementar regras da API sem copiar código sem licença.
3. API NestJS: módulos de cardápio, mesas, pedidos, chamados e fechamento; OpenAPI, migrations reproduzíveis e testes de integração.
4. Frontend: atualização Next/React/Tailwind, adoção incremental de shadcn/Base UI, sessão same-origin, cliente gerado e migração de cada fluxo.
5. Verificação: testes unitários de domínio, integração com PostgreSQL e E2E para login, CRUD de produto, mesa/QR, pedido, estado da cozinha, fechamento e isolamento.
6. Portfólio e infraestrutura declarada: README, diagramas, ADRs, guia local, segurança e IaC sem apply. O provedor permanece em aberto até decisão explícita.

## Critérios de aceite

- Um comando documentado inicia web, API e PostgreSQL localmente.
- Migrations criam banco vazio e seed gera dados de demonstração reproduzíveis.
- OpenAPI descreve as rotas NestJS e o cliente TypeScript é gerado sem cópia manual de DTOs.
- O fluxo QR → cardápio → pedido → cozinha → fechamento passa em E2E.
- Testes provam que usuários de um restaurante não leem nem alteram dados de outro.
- Sessões têm expiração e revogação; preço e estado são validados no servidor.
- ESLint, TypeScript, testes e builds passam nos dois aplicativos.
- O lockfile pnpm é determinístico e validado em CI.
- Auditoria de dependências não deixa vulnerabilidades críticas sem correção ou justificativa registrada.
- Nenhum segredo real ou banco com dados reais fica no repositório.
- Nenhum deploy, provisionamento ou apply ocorre como parte destas fases.

## Riscos e respostas

| Risco | Resposta |
|---|---|
| Código do backend sem licença | Reimplementar de forma independente; pedir autorização antes de qualquer reutilização literal. |
| Banco versionado conter dados reais | Não abrir ou migrar sem confirmar origem, conteúdo e plano de backup; substituí-lo por seed aprovado. |
| Reescrita da API e mudança para TypeScript | Migrar domínio por domínio, cobrir regras com testes e consultar o backend legado apenas como referência funcional, sem reutilizar código sem licença. |
| Isolamento multi-tenant incompleto | Tenant obrigatório no modelo, escopo centralizado e testes cruzados em integração. |
| Atualização Next/React/Tailwind incompatível | Corrigir dependências, revisar webpack/Turbopack e navegadores-alvo, validar builds e acessibilidade antes de migrar o restante. |
| Compatibilidade entre Next 16, Nest 12 e Prisma 7 | Validar ESM, geração de client, migrations, testes e builds no início da fundação; manter versões fixadas e dependências Nest na mesma major. |
| Quebra de contratos do frontend | Gerar o cliente da OpenAPI, migrar domínio por domínio e rodar E2E a cada fluxo. |
| Projeto crescer além do MVP | Limitar a primeira entrega ao ciclo completo de pedidos e registrar ideias adicionais no roadmap. |
| Provedor de deploy indefinido | Manter Compose e IaC preparados sem escolher ou provisionar serviços remotos. |

## Fontes técnicas consultadas

As versões exatas citadas foram verificadas nos metadados do npm em 12/10/2026 e precisam ser revalidadas quando a implementação começar.

- [Next.js 16: guia oficial de upgrade](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js no npm](https://www.npmjs.com/package/next) e [React no npm](https://www.npmjs.com/package/react)
- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- [Node.js: releases e política de LTS](https://nodejs.org/en/about/previous-releases)
- [NestJS: primeiros passos](https://docs.nestjs.com/first-steps)
- [NestJS 12: guia oficial de migração e requisitos do CLI](https://docs.nestjs.com/migration-guide)
- [NestJS: OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [NestJS Core no npm](https://www.npmjs.com/package/@nestjs/core), [Nest CLI no npm](https://www.npmjs.com/package/@nestjs/cli) e [Nest Swagger no npm](https://www.npmjs.com/package/@nestjs/swagger)
- [class-validator](https://www.npmjs.com/package/class-validator) e [class-transformer](https://www.npmjs.com/package/class-transformer)
- [Prisma CLI no npm](https://www.npmjs.com/package/prisma), [Prisma Client no npm](https://www.npmjs.com/package/@prisma/client) e [PostgreSQL adapter no npm](https://www.npmjs.com/package/@prisma/adapter-pg)
- [Prisma ORM: documentação](https://www.prisma.io/docs/orm)
- [Prisma ORM: estado das releases](https://www.prisma.io/docs/orm/release-status)
- [PostgreSQL: política de versões suportadas](https://www.postgresql.org/support/versioning/)
- [Tailwind CSS 4: guia de upgrade](https://tailwindcss.com/docs/upgrade-guide)
- [shadcn/ui: Base UI como padrão e suporte contínuo ao Radix](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- [Tailwind CSS](https://www.npmjs.com/package/tailwindcss), [shadcn CLI](https://www.npmjs.com/package/shadcn), [Base UI](https://www.npmjs.com/package/@base-ui/react), [Lucide](https://www.npmjs.com/package/lucide-react), [React Hook Form](https://www.npmjs.com/package/react-hook-form), [Zod](https://www.npmjs.com/package/zod) e [Motion](https://www.npmjs.com/package/motion)
- [pnpm](https://www.npmjs.com/package/pnpm), [Turborepo](https://www.npmjs.com/package/turbo), [TypeScript](https://www.npmjs.com/package/typescript), [Vitest](https://www.npmjs.com/package/vitest) e [Playwright](https://www.npmjs.com/package/@playwright/test)
- [Motion: acessibilidade e movimento reduzido](https://motion.dev/docs/react-use-reduced-motion)
- [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
