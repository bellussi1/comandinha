# Fechamento de atendimento por sessão de mesa — Plano de implementação

> **Para execução agentic:** usar superpowers:executing-plans para executar este plano tarefa por tarefa. Cada etapa termina com um commit atômico.

**Objetivo:** Completar o fluxo local do Comandinha com atendimentos por mesa, total calculado no servidor, encerramento e reabertura, sem integração de pagamento.

**Arquitetura:** O PostgreSQL mantém o histórico de sessões e vincula novos pedidos QR à sessão aberta. A API serializa abertura, pedido público e encerramento por mesa, mantém escopo de restaurante e expõe resumos ao painel e ao cardápio. O painel mobile-first abre/consulta/encerra atendimentos; o QR continua mostrando o cardápio, mas bloqueia o checkout quando não há sessão aberta.

**Stack:** Next.js 16, React 19, NestJS 12, Prisma 7, PostgreSQL, Vitest, Jest e Playwright já usados no monorepo.

**Especificação:** docs/superpowers/specs/2026-10-14-comandinha-table-session-closure-design.md

## Restrições globais

- OWNER/ADMIN podem abrir e encerrar; STAFF só consulta o resumo.
- Só pode existir uma sessão OPEN por mesa; pedidos QR e encerramento são sincronizados no banco.
- O total fechado é a soma, em centavos, dos pedidos DELIVERED vinculados; CANCELLED é excluído.
- Fechamento é permitido somente sem pedidos PENDING, PREPARING ou READY; sessão sem pedidos pode fechar.
- Pedidos antigos podem permanecer sem diningSessionId e não são retroativamente associados.
- Nova sessão não herda pedidos anteriores; pedidos antigos seguem consultáveis por seu próprio identificador QR.
- Mesa inativa não abre sessão nem aceita pedido; desativação com sessão aberta retorna 409.
- Não adicionar pagamento, métodos de pagamento, divisão, gorjeta, desconto ou chamada de garçom.
- Manter responsividade em 320, 360, 768 e 1440 CSS px, teclado, foco visível, contraste e prefers-reduced-motion.
- Não implantar nem alterar infraestrutura nesta etapa.

## Foco da revisão

- Corrida entre fechar atendimento e criar pedido: teste rejects checkout after a session is closed and links concurrent orders to exactly one session.
- Duas aberturas simultâneas: teste serializes concurrent opens and leaves only one open session for a table.
- Isolamento entre restaurantes: teste hides another restaurant session from reads and close requests.
- Retry idempotente após fechar: teste returns an already-created order for its request id after the session closes.
- Estado fechado no QR em telas estreitas: teste Playwright blocks checkout while showing the menu when no session is open em 320 e 360 px.

---

### Task 1: Persistir sessões e preservar integridade histórica

**Arquivos**
- Modificar: apps/api/prisma/schema.prisma
- Criar: apps/api/prisma/migrations/20261014170000_table_dining_sessions/migration.sql
- Testar: apps/api/test/domain-schema.integration-spec.ts

**Interfaces**
- DiningSession: id UUID, restaurantId UUID, tableId UUID, status OPEN/CLOSED, openedAt, closedAt nullable, closedTotalInCents nullable.
- Order.diningSessionId é nullable; relação composta garante que sessão, mesa e pedido pertencem ao mesmo restaurante.
- Índice único parcial PostgreSQL permite uma sessão OPEN por tableId.

- [ ] Escrever teste de esquema para sessão nova, pedido histórico nulo, vínculo composto tenant-safe e unicidade parcial.
- [ ] Rodar o teste de integração e confirmar falha antes da migração.
- [ ] Adicionar modelo, relações, índices e migração sem atualizar ou apagar registros existentes.
- [ ] Rodar prisma generate, teste de integração e typecheck da API.
- [ ] Commit: feat: add dining session persistence.

### Task 2: Abrir, consultar e fechar sessões pela API administrativa

**Arquivos**
- Criar: apps/api/src/tables/dining-sessions.service.ts
- Criar: apps/api/src/tables/dining-sessions.dto.ts
- Modificar: apps/api/src/tables/tables.controller.ts
- Modificar: apps/api/src/tables/tables.service.ts
- Modificar: apps/api/src/tables/tables.module.ts
- Testar: apps/api/test/tables.integration-spec.ts

**Interfaces**
- POST /tables/:id/session abre, retornando 201; retry retorna a sessão OPEN existente com 200.
- GET /tables/:id/session retorna { session: null } ou o resumo detalhado e pedidos daquela sessão.
- POST /sessions/:id/close persiste closedAt e closedTotalInCents; repetição retorna o fechamento persistido.
- GET /tables acrescenta currentSession ou null com id, openedAt, total projetado e contagem de pedidos não terminais.
- Erros de estado são 409; recurso de outro restaurante é 404; STAFF recebe 403 para escrita.

- [ ] Acrescentar testes PostgreSQL para abrir/ler/fechar/retry/reabrir, pedidos em cada estado, sessão vazia, permissões, isolamento, mesa inativa e duas aberturas concorrentes.
- [ ] Executar os testes e conferir que falham pelo contrato ausente.
- [ ] Implementar endpoints e resumo usando o restaurante do AdminPrincipal; travar a linha da mesa durante operações e usar índice parcial como última garantia.
- [ ] Testar desativação bloqueada com sessão OPEN e manter compatibilidade com mesas sem histórico.
- [ ] Rodar testes de tabelas e typecheck; commit feat: add table session lifecycle API.

### Task 3: Vincular pedidos públicos à sessão ativa

**Arquivos**
- Modificar: apps/api/src/orders/orders.service.ts
- Modificar: apps/api/src/public-dining/public-dining.service.ts
- Modificar: apps/api/src/public-dining/public-dining.controller.ts
- Modificar: apps/api/src/public-dining/public-dining.dto.ts
- Testar: apps/api/test/public-dining.integration-spec.ts

**Interfaces**
- GET /public/tables/:code/menu acrescenta acceptingOrders.
- POST /public/tables/:code/orders exige mesa ativa e sessão OPEN, grava diningSessionId e retorna 409 sem sessão.
- GET .../orders lista apenas pedidos da sessão OPEN atual, ou [] quando fechada/ausente.
- GET .../orders/:orderId continua exibindo pedido histórico da mesma mesa.
- Repetir idempotencyKey existente retorna o pedido original mesmo depois do fechamento.

- [ ] Criar testes PostgreSQL para cardápio fechado, checkout sem sessão, vínculo com sessão atual, histórico separado ao reabrir, retry após fechar e corrida pedido/fechamento.
- [ ] Rodar os testes e confirmar falha antes das alterações.
- [ ] Sincronizar createPublicOrder com close usando o lock da mesa; procurar idempotência existente antes de exigir sessão OPEN.
- [ ] Atualizar consultas públicas e Swagger sem expor notas ou dados pessoais.
- [ ] Rodar testes públicos e typecheck; commit feat: scope QR orders to open table sessions.

### Task 4: Tornar o seed de demonstração idempotente para sessões

**Arquivos**
- Modificar: apps/api/prisma/seed-demo.ts
- Testar: apps/api/prisma/seed-demo.integration-spec.ts

- [ ] Testar que o seed abre uma sessão para mesas demo sem histórico, não duplica em reexecução e não reabre sessão encerrada.
- [ ] Rodar teste e confirmar falha.
- [ ] Criar sessões demo apenas para mesas do seed ainda sem qualquer histórico; preservar dados de mesas e pedidos não seedados.
- [ ] Reexecutar o teste e typecheck; commit feat: seed demo table sessions.

### Task 5: Atualizar OpenAPI, cliente e rotas BFF

**Arquivos**
- Regenerar: apps/api/openapi.json
- Regenerar: packages/api-client/src/generated/schema.d.ts
- Modificar: apps/web/src/services/panel-tables.ts
- Modificar: apps/web/src/services/public-dining.ts
- Modificar: apps/web/src/app/api/admin/tables/[...segments]/route.ts
- Criar: apps/web/src/app/api/admin/sessions/[id]/close/route.ts
- Modificar/testar: apps/web/src/app/api/public/tables/[code]/menu/route.ts
- Testar: apps/web/src/app/api/admin/tables/[...segments]/__tests__/route.test.ts e rotas BFF de sessão e cardápio

- [ ] Adicionar testes do BFF para propagar status 409, autenticação e contrato de abertura/consulta/fechamento.
- [ ] Rodar os testes para registrar falha inicial.
- [ ] Gerar cliente com pnpm api:client:generate; adicionar wrappers tipados para endpoints administrativos e públicos; manter BFF sem expor credencial do gateway.
- [ ] Rodar testes BFF, pnpm api:client:check e typecheck; commit feat: expose table session contracts to web.

### Task 6: Integrar conta e ações na tela de mesas

**Arquivos**
- Modificar: apps/web/src/components/painel/mesas/TablesWorkspace.tsx
- Criar: apps/web/src/components/painel/mesas/TableSessionDialog.tsx
- Modificar: apps/web/src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx
- Criar/testar: apps/web/src/components/painel/mesas/__tests__/TableSessionDialog.test.tsx

- [ ] Testar estados Livre/Em atendimento, abertura para OWNER/ADMIN, resumo para STAFF, total projetado, pendências, bloqueio de fechamento e confirmação.
- [ ] Rodar testes e observar a falha inicial.
- [ ] Mostrar total e ação contextual no cartão da mesa; usar diálogo acessível para detalhes e confirmação; atualizar lista após mutações.
- [ ] Respeitar estado de carregamento/erro, alvos de toque e movimento reduzido; verificar os tamanhos 320/360/768/1440 no teste visual existente.
- [ ] Rodar testes do componente e typecheck; commit feat: manage table sessions from mobile workspace.

### Task 7: Bloquear novo pedido no QR sem esconder o cardápio

**Arquivos**
- Modificar: apps/web/src/components/public-menu/PublicMenu.tsx
- Modificar: apps/web/src/components/public-menu/__tests__/PublicMenu.test.tsx
- Modificar: apps/web/e2e/painel-dining.spec.ts

- [ ] Testar acceptingOrders=false: cardápio continua legível, adicionar/carrinho/checkout ficam indisponíveis, aviso explica que a equipe abrirá a mesa.
- [ ] Rodar testes para verificar falha antes da implementação.
- [ ] Desabilitar interações de pedido sem apagar o carrinho local; traduzir 409 de sessão fechada com mensagem clara e oferecer recarga do cardápio.
- [ ] Cobrir mesa aberta, fechada e reaberta no E2E em 320, 360, 768 e 1440 px, teclado, foco e reduced motion.
- [ ] Rodar testes Jest e Playwright do fluxo QR; commit feat: gate QR checkout by table session.

### Task 8: Documentar o ciclo e verificar o monorepo

**Arquivos**
- Criar: docs/funcionalidades/sessoes-de-mesa.md
- Modificar: README.md e índice de documentação existente
- Testar: checagens de documentação, lint, typecheck, testes, integração PostgreSQL, Playwright e build

- [ ] Documentar estados, endpoints, total, compatibilidade com pedidos legados e limites sem pagamento.
- [ ] Executar validação de links/índice e corrigir referência quebrada.
- [ ] Rodar lint, typecheck, testes unitários, integração com PostgreSQL, Playwright e build; registrar bloqueios de infraestrutura como tais.
- [ ] Commit docs: document table session closure.


