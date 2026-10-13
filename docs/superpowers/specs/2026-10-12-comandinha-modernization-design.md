# Comandinha — especificação de modernização fullstack

**Status:** proposta para revisão. Esta especificação define o caminho recomendado; não autoriza implementação, deploy ou provisionamento.

## Objetivo

Modernizar o Comandinha como projeto de portfólio que demonstre engenharia fullstack com decisões proporcionais ao produto: modelagem relacional, segurança, isolamento entre restaurantes, contratos de API, testes, execução local reproduzível e documentação técnica.

O MVP deve demonstrar o ciclo QR Code → cardápio → carrinho → pedido → cozinha/administração → fechamento da mesa. A prioridade é corrigir os limites de autorização e consistência antes de adicionar funcionalidades. Não serão declaradas métricas, produção, escala ou resultados sem evidência.

## Contexto auditado

A auditoria foi feita em 12 de outubro de 2026, nas cópias locais dos seguintes estados:

- Frontend bellussi1/comandinha, branch master, commit d95a617.
- Backend thiagombrs/comandinha-backend, branch main, commit 501b028.

O frontend usa Next.js 15.0.2, React 19 RC, TypeScript e Tailwind. O backend usa FastAPI, SQLAlchemy, Alembic e PostgreSQL/SQLite. O backend possui routers, schemas, repositórios e modelos; não é correto descrevê-lo como sem separação de responsabilidades.

Achados que afetam a arquitetura:

- A assinatura de JWT usa uma chave fixa no código.
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
- Não reutilizar nem republicar código do backend de terceiros sem licença ou autorização verificável. Tratar o backend como referência funcional; implementar a nova API de forma independente.
- Não executar deploy, publicação, provisionamento cloud, Terraform apply ou equivalente.
- Não inserir segredos reais. Registrar exemplos apenas em arquivos de ambiente de exemplo.
- Não migrar ou apagar dados sem inventário, backup, plano de recuperação e validação.
- Manter um monólito modular. Não adicionar microsserviços, Kubernetes, Redis ou filas sem requisito demonstrável.
- Preservar no frontend apenas fluxos úteis e confirmados; distinguir fluxo implementado, parcial, documentado e proposto.
- Não afirmar ganho de performance sem medição comparável.

## Alternativas avaliadas

### A. Manter FastAPI e Next.js em repositórios separados

Reduz a reescrita e preserva duas tecnologias maduras. Exige coordenação de contratos entre linguagens e não resolve por si só a falta de tenant, autorização, sessões ou consistência. Adequada se reduzir risco de migração for mais importante que consolidar a stack.

### B. Monorepo TypeScript com Next.js e NestJS — recomendada

Usa Next.js no frontend e NestJS na API, com módulos de domínio, OpenAPI e cliente TypeScript gerado. Consolida a linguagem e torna visível o contrato entre aplicações. O custo é maior: reimplementação do backend, migração de dados e compatibilização de fluxos. A implementação do backend deve ser clean-room enquanto a licença não estiver esclarecida.

### C. Monorepo Next.js e FastAPI

Centraliza documentação, Compose e CI sem reescrever imediatamente a API. Mantém a duplicidade de linguagens e a necessidade de gerar e distribuir contratos. Pode servir de etapa transitória caso a reescrita seja adiada, mas não é a recomendação final para este portfólio.

## Decisões propostas

### Workspace

Adotar pnpm workspaces com Turborepo. O workspace deve conter web, API, cliente de API gerado e configurações compartilhadas realmente utilizadas. Turborepo coordena lint, testes, geração de contrato e builds; Nx não é necessário para dois aplicativos e poucos pacotes.

A estrutura inicial proposta é:

- apps/web — Next.js App Router.
- apps/api — NestJS modular.
- packages/api-client — cliente TypeScript gerado da especificação OpenAPI.
- packages/eslint-config e packages/typescript-config — apenas se ambos os aplicativos compartilharem configuração.
- infra/docker — Dockerfiles e Compose local.
- docs/architecture, docs/adr, docs/api e docs/diagrams — decisões e documentação.

Não criar pacote genérico shared nem biblioteca UI até haver consumidores e responsabilidade definidos.

### Frameworks e versões

Atualizar o Next para uma versão estável e corrigida, mantendo o App Router. Na auditoria, a tag estável consultada era Next 16.4.0 e React 19.3.0; as versões exatas devem ser revalidadas com documentação e builds antes da implementação. Revisar o webpack customizado, consolidar next.config e substituir o script next lint conforme a versão adotada. O upgrade do Next 16 requer cuidado porque o build passa a usar Turbopack por padrão e a configuração webpack atual é extensa.

Usar NestJS 12 com TypeScript strict. A máquina auditada tem Node 24.13.0; atualizar o runtime para pelo menos 24.15 antes de executar os geradores atuais do Nest.

Adotar PostgreSQL como banco do sistema. Docker Compose oferece o ambiente local. Não manter SQLite versionado como fixture; seed e dados de demonstração devem ser gerados explicitamente.

### ORM

Usar Prisma 7 estável, fixado em versão compatível. Prisma favorece schema declarativo, client tipado e onboarding; Drizzle oferece schema TypeScript mais próximo de SQL e migrations mais explícitas. Os dois são adequados para PostgreSQL e transações do MVP; não há benchmark que justifique uma escolha por desempenho. A documentação consultada indicava Prisma 8 como release candidate, portanto não usar essa linha no início.

### API e BFF

Usar REST com OpenAPI como fonte de verdade. NestJS gera o documento OpenAPI; o cliente TypeScript é gerado e validado em CI. Não manter DTOs equivalentes manualmente em frontend e backend.

Não criar serviço BFF independente. Usar Route Handlers do Next como gateway same-origin limitado a sessão e proxy de chamadas do navegador. Esses handlers não carregam regras de negócio: NestJS continua sendo a autoridade de autenticação, autorização e domínio. Não expor tokens administrativos a JavaScript do navegador.

### Identidade, sessão e multi-tenancy

Separar usuários, restaurantes e memberships. Uma identidade pode pertencer a um ou mais restaurantes, com papel explícito por membership. O tenant ativo é determinado pela sessão validada; nunca se confia em restaurant_id fornecido pelo cliente.

As tabelas de domínio carregam restaurant_id, com índices, unicidades e relações compostas adequadas. Queries e mutations são sempre escopadas pelo tenant autenticado. O plano de testes inclui tentativas de leitura, alteração e exclusão cruzadas entre dois restaurantes.

Para administração, preferir sessão opaca com validade e revogação no PostgreSQL, entregue em cookie HttpOnly, Secure e SameSite. A camada Next encaminha a sessão ao Nest; mutações verificam origem e proteção CSRF apropriada. Para clientes de mesa, usar sessão limitada à mesa e ao restaurante, revogável no fechamento; QR Code não confere permissões administrativas. Aplicar limites de requisição ao login, chamadas e criação de pedidos.

RLS no PostgreSQL pode ser avaliada como defesa adicional após o escopo da aplicação estar coberto por testes. Não será a única barreira de tenant.

### Domínio e consistência

Os módulos de domínio iniciais são restaurantes/memberships, autenticação, cardápio, mesas/sessões, pedidos, chamados e fechamento.

O servidor recalcula totais. Preços persistidos devem usar centavos inteiros ou NUMERIC/Decimal, não Float. Cada item registra snapshot de nome, preço unitário e adicionais no momento do pedido. A criação valida disponibilidade, quantidade, restaurante e sessão da mesa.

Criar pedido, itens e mudança de estado da mesa dentro de uma transação. Requisições repetidas usam chave de idempotência. Estados permitidos são explícitos e cada alteração gera histórico. O fechamento persiste data, método informado e pedidos fechados atomicamente. Não haverá processamento de pagamento nesta etapa.

Manter polling no início, com intervalos e consultas medidos. Avaliar SSE se o fluxo da cozinha demonstrar necessidade de menor latência. Não adicionar WebSocket sem necessidade bidirecional.

## Migração

A migração não é um corte único para produção. O backend atual não tem licença declarada e o banco SQLite versionado não foi inspecionado; qualquer migração de dados exige autorização e inventário separados.

Fases propostas:

1. Fundação: branch de trabalho, workspace pnpm/Turbo, Node compatível, Compose com PostgreSQL, CI para lint, typecheck, testes e build.
2. Modelo e autenticação: schema novo, migrations revisáveis, usuários/memberships/tenant, sessões, políticas de acesso e testes de isolamento.
3. API: módulos de cardápio, mesas, pedidos, chamados e fechamento; OpenAPI e migrations reproduzíveis.
4. Frontend: compatibilidade com React/Next estáveis, sessão same-origin, cliente gerado e migração incremental de cada fluxo.
5. Verificação: testes unitários de domínio, integração com PostgreSQL e E2E para login, CRUD de produto, mesa/QR, pedido, estado da cozinha, fechamento e isolamento.
6. Portfólio e infraestrutura declarada: README, diagramas, ADRs, guia local, segurança e IaC sem apply. O provedor permanece em aberto até decisão explícita.

## Critérios de aceite

- Um comando documentado inicia web, API e PostgreSQL localmente.
- Migrations criam banco vazio e seed gera dados de demonstração reproduzíveis.
- OpenAPI descreve rotas e cliente TypeScript é gerado sem cópia manual de DTOs.
- O fluxo QR → cardápio → pedido → cozinha → fechamento passa em E2E.
- Testes provam que usuários de um restaurante não leem nem alteram dados de outro.
- Sessões têm expiração/revogação; preço e estado são validados no servidor.
- Lint, typecheck, testes e build passam nos dois aplicativos.
- Auditoria de dependências não deixa vulnerabilidades críticas sem correção ou justificativa registrada.
- Nenhum segredo real ou banco com dados reais fica no repositório.
- Nenhum deploy, provisionamento ou apply ocorre como parte destas fases.

## Riscos e respostas

| Risco | Resposta |
|---|---|
| Código do backend sem licença | Reimplementação independente; solicitar autorização antes de qualquer reutilização literal. |
| Banco versionado conter dados reais | Não abrir ou migrar sem confirmar origem, conteúdo e plano de backup; substituí-lo por seed aprovado. |
| Quebra de contratos do frontend | Gerar cliente da OpenAPI, migrar domínio por domínio e rodar E2E a cada fluxo. |
| Isolamento multi-tenant incompleto | Tenant obrigatório no modelo, escopo centralizado e testes cruzados em integração. |
| Atualização Next/React incompatível | Corrigir dependências críticas, remover ou adaptar configuração webpack e validar build de produção antes de migrar o restante. |
| Projeto crescer além do MVP | Limitar a primeira entrega ao ciclo completo de pedidos e registrar ideias adicionais no roadmap. |
| Provedor de deploy indefinido | Manter Compose e IaC preparados sem escolher ou provisionar serviços remotos. |

## Fontes técnicas consultadas

- [React: aviso de segurança para Server Components](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [Next.js: guia de upgrade para v16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- [pnpm workspaces](https://pnpm.io/workspaces)
- [Turborepo](https://turborepo.dev/docs)
- [NestJS: primeiros passos](https://docs.nestjs.com/first-steps)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [Prisma ORM](https://www.prisma.io/docs/orm)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
