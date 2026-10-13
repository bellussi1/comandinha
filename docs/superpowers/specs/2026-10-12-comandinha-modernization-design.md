# Comandinha — especificação de modernização fullstack

**Status:** proposta revisada para avaliação. Direção escolhida: monorepo Next.js + FastAPI. Este documento ainda não autoriza implementação, publicação ou provisionamento.

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

### B. Monorepo Next.js e NestJS

Consolida a linguagem e permite gerar um cliente TypeScript diretamente de OpenAPI, mas demanda reescrever a API e revalidar todas as regras de negócio. Para o escopo atual, amplia o risco e o trabalho sem resolver problemas que também podem ser corrigidos em FastAPI. Não é a direção escolhida.

### C. Monorepo Next.js e FastAPI — recomendada

Mantém o backend Python e o frontend Next.js, reúne documentação, Compose e CI e publica o contrato da API pelo OpenAPI gerado pelo FastAPI. O custo é uma toolchain mista: pnpm para o workspace JavaScript/TypeScript e uv para o projeto Python. Essa separação é explícita e cada ecossistema mantém seu lockfile.

A modernização não deve importar código do repositório sem licença. Se a autorização não for obtida, a API no monorepo deve ser implementada de forma independente a partir dos fluxos e regras observáveis.

## Decisões propostas

### Monorepo e execução local

Usar pnpm workspaces e Turborepo para o app web e pacotes JavaScript/TypeScript. Usar uv, pyproject.toml e uv.lock para dependências e ambiente da API Python. O Turbo não será usado como substituto do gerenciador de ambiente Python; os comandos da API serão executados via uv ou Docker Compose.

Estrutura inicial:

- apps/web — Next.js App Router.
- apps/api — FastAPI, SQLAlchemy e Alembic, com pyproject.toml e uv.lock.
- packages/api-client — tipos OpenAPI e cliente TypeScript gerados.
- packages/eslint-config e packages/typescript-config — somente se web e cliente realmente compartilharem essas configurações.
- infra/docker — Dockerfiles e configuração local, ou arquivos equivalentes na raiz se Compose ficar mais simples de descobrir.
- docs/architecture, docs/adr, docs/api e docs/diagrams — decisões, contrato e documentação.
- pnpm-workspace.yaml, turbo.json e compose.yaml — workspace JavaScript, tarefas e execução local.

Não criar pacote shared genérico nem uma biblioteca de componentes compartilhada sem consumidores e responsabilidades definidos. Componentes de UI permanecem em apps/web.

Docker Compose deve iniciar web, API e PostgreSQL com um comando documentado, usando variáveis de ambiente de exemplo e dados de demonstração reproduzíveis. CI instala e valida os ambientes Node e Python em tarefas próprias, com PostgreSQL para integração.

### Frameworks e versões

Atualizar o frontend para a linha estável, corrigida e compatível mais recente do Next.js 16, mantendo App Router e TypeScript strict. Em 12/10/2026, Next.js 16.4.0 era a release estável observada e React 19.3.0 estava estável. Como o time do Next anunciou uma atualização de segurança upstream para 14/10/2026, validar de novo a versão corrigida antes de fixar o lockfile e antes da fase de implementação.

Revisar a configuração webpack extensa e testar a migração para o Turbopack padrão do Next 16. Corrigir conflitos entre next.config.js e next.config.mjs; substituir next lint por ESLint executado diretamente. Ativar Cache Components apenas depois de testar cache, revalidação e estados dinâmicos das rotas.

Atualizar a API para a versão estável compatível mais recente do FastAPI. Em 12/10/2026, a release consultada era 0.142.2. Migrar gradualmente SQLAlchemy 1.4 para SQLAlchemy 2.1 e Alembic 1.20, mantendo Pydantic 2 e tipagem estrita. Atualizar Uvicorn, driver PostgreSQL e dependências antigas/removidas com validação de compatibilidade; substituir a lista de versões antigas em requirements.txt por pyproject.toml e lockfile uv.

Usar Node 24 LTS com patch atualizado. Python 3.15.0 foi lançado em 09/10/2026; testar a API e as dependências compiladas nessa versão antes de adotá-la. Se houver dependência sem suporte confiável, usar a última versão de manutenção do Python 3.14 até o ecossistema necessário estar validado.

### Banco e persistência

Adotar PostgreSQL 18, linha suportada e estável na data desta revisão, atualizando para o último minor disponível. Docker Compose oferece o ambiente local. Não manter SQLite versionado como fixture; seeds e dados de demonstração devem ser gerados explicitamente.

Usar SQLAlchemy 2.1 com Alembic compatível, sem trocar para Prisma ou Drizzle: esses ORMs atendem ao stack TypeScript e não são apropriados para uma API FastAPI. Usar o driver psycopg 3 após verificar compatibilidade com o ambiente escolhido. Começar com o padrão de acesso síncrono já usado pelo backend; adotar asyncio somente se houver necessidade técnica comprovada e teste de ponta a ponta.

### API, contrato e BFF

Usar REST com OpenAPI como fonte de verdade. FastAPI publica o schema OpenAPI. Gerar os tipos com openapi-typescript e usar openapi-fetch como cliente pequeno baseado em Fetch. O schema e o cliente são validados em CI; não manter DTOs equivalentes manualmente no frontend e na API.

Não criar serviço BFF independente. Usar Route Handlers do Next como gateway same-origin limitado à sessão e ao proxy das chamadas do navegador. Os handlers não carregam regras de negócio: FastAPI continua sendo a autoridade de autenticação, autorização e domínio. Não expor credenciais administrativas a JavaScript do navegador.

### Identidade, sessão e multi-tenancy

Separar usuários, restaurantes e memberships. Uma identidade pode pertencer a um ou mais restaurantes, com papel explícito por membership. O tenant ativo é determinado pela sessão validada; nunca se confia em restaurant_id fornecido pelo cliente.

As tabelas de domínio carregam restaurant_id, com índices, unicidades e relações compostas adequadas. Queries e mutations são sempre escopadas pelo tenant autenticado. O plano de testes inclui tentativas de leitura, alteração e exclusão cruzadas entre dois restaurantes.

Para administração, preferir sessão opaca com validade e revogação no PostgreSQL, entregue em cookie HttpOnly, Secure e SameSite. A camada Next encaminha a sessão ao FastAPI; mutações verificam origem e proteção CSRF apropriada. Para clientes de mesa, usar sessão limitada à mesa e ao restaurante, revogável no fechamento; QR Code não concede permissões administrativas. Aplicar limites de requisição ao login, chamadas e criação de pedidos.

RLS no PostgreSQL pode ser avaliada como defesa adicional depois que o escopo da aplicação estiver coberto por testes. Não será a única barreira de tenant.

### Domínio e consistência

Os módulos de domínio iniciais são restaurantes/memberships, autenticação, cardápio, mesas/sessões, pedidos, chamados e fechamento.

O servidor recalcula totais. Preços persistidos usam centavos inteiros ou NUMERIC/Decimal, não Float. Cada item registra snapshot de nome, preço unitário e adicionais no momento do pedido. A criação valida disponibilidade, quantidade, restaurante e sessão da mesa.

Criar pedido, itens e mudança de estado da mesa dentro de uma transação. Requisições repetidas usam chave de idempotência. Estados permitidos são explícitos e cada alteração gera histórico. O fechamento persiste data, método informado e pedidos fechados atomicamente. Não haverá processamento de pagamento nesta etapa.

Manter polling no início, com intervalos e consultas medidos. Avaliar SSE se o fluxo da cozinha demonstrar necessidade de menor latência. Não adicionar WebSocket sem necessidade bidirecional.

### Interface e bibliotecas visuais

Atualizar Tailwind CSS para a linha estável 4.3, após conferir os navegadores-alvo porque a versão 4 depende de recursos modernos de CSS. Preservar a identidade do Comandinha com tokens próprios, contraste, estados claros e componentes responsivos; a biblioteca fornece primitives e acessibilidade, não uma aparência pronta.

Manter shadcn/ui com Radix UI para os componentes já existentes, evitando migrar toda a aplicação de primitives só para acompanhar o padrão novo do CLI. A documentação atual do shadcn também oferece Base UI como opção padrão para projetos novos e continua suportando Radix; qualquer adoção de Base UI deve ser pontual e manter consistência dentro do fluxo que a usar.

Atualizar lucide-react para ícones, sonner para notificações e substituir tailwindcss-animate depreciado por tw-animate-css quando as animações atuais forem migradas. Manter React Hook Form e Zod nas versões estáveis compatíveis para formulários com validação; não espalhar bibliotecas em formulários simples que podem usar recursos nativos.

Priorizar transições CSS curtas, skeletons e feedback de ações. Respeitar prefers-reduced-motion; não adicionar Framer Motion ou animações extensas sem um caso de uso definido. Revisar dependências duplicadas, incluindo Radix Toast se já houver substituição completa por Sonner.

### Migração

A migração não é um corte único para produção. O backend atual não tem licença declarada e o banco SQLite versionado não foi inspecionado; qualquer migração de código ou dados exige autorização e inventário separados.

Fases propostas:

1. Fundação: branch de trabalho, monorepo, pnpm/Turbo para JavaScript, uv para Python, runtime compatível, Compose com PostgreSQL, configuração de qualidade e CI.
2. Modelo e autenticação: schema novo, migrations revisáveis, usuários/memberships/tenant, sessões, políticas de acesso e testes de isolamento. Reimplementar o backend de forma independente se a licença não for esclarecida.
3. API FastAPI: módulos de cardápio, mesas, pedidos, chamados e fechamento; OpenAPI e migrations reproduzíveis.
4. Frontend: atualização Next/React/Tailwind, revisão de UI, sessão same-origin, cliente gerado e migração incremental de cada fluxo.
5. Verificação: testes unitários de domínio, integração com PostgreSQL e E2E para login, CRUD de produto, mesa/QR, pedido, estado da cozinha, fechamento e isolamento.
6. Portfólio e infraestrutura declarada: README, diagramas, ADRs, guia local, segurança e IaC sem apply. O provedor permanece em aberto até decisão explícita.

## Critérios de aceite

- Um comando documentado inicia web, API e PostgreSQL localmente.
- Migrations criam banco vazio e seed gera dados de demonstração reproduzíveis.
- OpenAPI descreve as rotas FastAPI e o cliente TypeScript é gerado sem cópia manual de DTOs.
- O fluxo QR → cardápio → pedido → cozinha → fechamento passa em E2E.
- Testes provam que usuários de um restaurante não leem nem alteram dados de outro.
- Sessões têm expiração e revogação; preço e estado são validados no servidor.
- ESLint, TypeScript, Ruff, verificação de tipos Python, testes e builds passam nos dois aplicativos.
- Lockfiles pnpm e uv são determinísticos e validados em CI.
- Auditoria de dependências não deixa vulnerabilidades críticas sem correção ou justificativa registrada.
- Nenhum segredo real ou banco com dados reais fica no repositório.
- Nenhum deploy, provisionamento ou apply ocorre como parte destas fases.

## Riscos e respostas

| Risco | Resposta |
|---|---|
| Código do backend sem licença | Reimplementar de forma independente; pedir autorização antes de qualquer reutilização literal. |
| Banco versionado conter dados reais | Não abrir ou migrar sem confirmar origem, conteúdo e plano de backup; substituí-lo por seed aprovado. |
| Toolchain Python e TypeScript | Fixar versões em uv e pnpm, separar jobs de CI e oferecer um comando Compose para execução local. |
| Isolamento multi-tenant incompleto | Tenant obrigatório no modelo, escopo centralizado e testes cruzados em integração. |
| Atualização Next/React/Tailwind incompatível | Corrigir dependências, revisar webpack/Turbopack e navegadores-alvo, validar builds e acessibilidade antes de migrar o restante. |
| Python 3.15 recém-lançado | Testar dependências nativas e CI; usar Python 3.14 se a matriz não estiver madura. |
| Quebra de contratos do frontend | Gerar o cliente da OpenAPI, migrar domínio por domínio e rodar E2E a cada fluxo. |
| Projeto crescer além do MVP | Limitar a primeira entrega ao ciclo completo de pedidos e registrar ideias adicionais no roadmap. |
| Provedor de deploy indefinido | Manter Compose e IaC preparados sem escolher ou provisionar serviços remotos. |

## Fontes técnicas consultadas

- [Next.js: releases e atualização de segurança anunciada](https://nextjs.org/blog)
- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- [FastAPI: notas de release](https://fastapi.tiangolo.com/release-notes/)
- [Python 3.15.0](https://www.python.org/downloads/release/python-3150/)
- [SQLAlchemy 2.1](https://docs.sqlalchemy.org/en/21/)
- [Alembic changelog](https://alembic.sqlalchemy.org/en/latest/changelog.html)
- [PostgreSQL: política de versões suportadas](https://www.postgresql.org/support/versioning/)
- [Tailwind CSS: atualizações](https://tailwindcss.com/blog)
- [shadcn/ui: Base UI como padrão e suporte contínuo ao Radix](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- [uv: projetos Python e lockfile](https://docs.astral.sh/uv/guides/projects/)
- [OpenAPI TypeScript e openapi-fetch](https://openapi-ts.dev/openapi-fetch/)
- [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
