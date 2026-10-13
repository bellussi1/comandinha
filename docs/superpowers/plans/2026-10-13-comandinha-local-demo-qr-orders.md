# Seed local, QR e pedidos do Comandinha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Completar o fluxo local de demonstração com seed seguro, gestão de mesas e pedidos no painel novo e pedido por QR acompanhado pelo cliente.

**Architecture:** Prisma/PostgreSQL guarda mesas e pedidos ligados ao restaurante. NestJS implementa operações autenticadas e endpoints públicos com preços calculados no servidor; Next.js encaminha chamadas por BFF same-origin e fornece painel responsivo e página pública mobile-first. As rotas legadas permanecem funcionais.

**Tech Stack:** Next.js 16.4.0, React 19.3.0, NestJS 12.1.3, Prisma 7.10.0, PostgreSQL, OpenAPI/openapi-typescript, Jest/Vitest e Playwright. Para o QR SVG no painel, usar qrcode.react 4.2.0, que inclui tipos TypeScript e renderização SVG conforme a [documentação do pacote no npm](https://www.npmjs.com/package/qrcode.react).

**Spec:** docs/superpowers/specs/2026-10-13-comandinha-local-demo-qr-orders-design.md

## Global Constraints

- A primeira demonstração é local. Publicar a nova API ou migrar dados em produção não faz parte desta implementação.
- A mudança é aditiva. Migrações Prisma são aplicadas apenas ao banco de desenvolvimento local durante a implementação.
- /admin, /mesa/[uuid] e sua configuração da API permanecem intactos.
- O seed existente é estendido sem enfraquecer suas proteções: ambiente diferente de produção, opt-in explícito, PostgreSQL em loopback e credenciais locais explícitas.
- O seed é idempotente, atualiza apenas os registros pertencentes ao conjunto de demonstração e não trunca tabelas nem remove outros dados.
- O servidor valida mesa e produtos ativos no mesmo restaurante e calcula preços e totais no servidor.
- A página pública mostra apenas nome do restaurante, nome da mesa, catálogo e resumos de pedidos associados à mesa. Não expõe dados pessoais.
- Pagamento, chamados de garçom, operação de cozinha e migração das rotas legadas ficam fora do escopo.
- A interface mantém a identidade coral/ameixa, tipografia e componentes coerentes com o painel novo, com foco visível, operação por teclado, alvos de toque adequados, rótulos acessíveis e respeito a prefers-reduced-motion.

## Review Focus

- Código QR desconhecido ou mesa desativada: retornar não encontrado sem revelar restaurante ou outros registros; cobrir no teste de integração da Task 4.
- Catálogo alterado entre abertura do menu e envio: reler disponibilidade e preço dentro da criação do pedido e rejeitar produto indisponível; cobrir na Task 4.
- Itens repetidos, quantidades inválidas ou observações acima do limite: rejeitar de forma determinística; cobrir na Task 4.
- Acesso de uma sessão ou código de mesa a outro restaurante/mesa: limitar toda consulta pelo tenant do principal ou pelo código público recebido; cobrir nas Tasks 2, 3 e 4.
- Toques repetidos ou falha de rede no checkout: impedir envio simultâneo, manter o carrinho em falha e permitir nova tentativa; cobrir com teste de componente e Playwright na Tasks 8 e 9.

---

### Task 1: Modelos e migração Prisma

**Files:**
- Modify: apps/api/prisma/schema.prisma
- Create: apps/api/prisma/migrations/20261013160000_tables_and_orders/migration.sql
- Test: apps/api/test/domain-schema.integration-spec.ts

**Interfaces:**
- Produces RestaurantTable with id, restaurantId, name, publicCode, isActive, createdAt and updatedAt. name is unique per restaurant; publicCode is globally unique; id plus restaurantId has a unique constraint for tenant-safe foreign keys.
- Produces OrderStatus with PENDING, PREPARING, READY, DELIVERED and CANCELLED.
- Produces Order with id, restaurantId, tableId, status, notes, totalInCents, createdAt and updatedAt; the table relation uses both tableId and restaurantId.
- Produces OrderItem with id, restaurantId, orderId, productId, nameSnapshot, unitPriceInCents, quantity, notes and lineTotalInCents; order and product relations enforce the same restaurant.

- [ ] **Step 1: Add a PostgreSQL integration test that creates a restaurant, table, order and item through Prisma and asserts the composite tenant relations and unique publicCode.** Run it against the current schema and confirm it fails because the models are absent.
- [ ] **Step 2: Add the enums, models, relations, unique constraints and indexes to schema.prisma. Use Restrict for table/order item history and Cascade only when deleting the restaurant in disposable test cleanup.**
- [ ] **Step 3: Generate the migration in migration.sql. Include indexes for restaurant/status/createdAt and table/createdAt, plus foreign keys that prevent cross-restaurant order/table/product references.**
- [ ] **Step 4: Run Prisma validate, generate, apply the migration to the local development database, and rerun the integration test. Expected: schema valid and all assertions pass.**
- [ ] **Step 5: Commit only the schema, migration and test as feat: add table and order persistence.**

### Task 2: API autenticada de mesas

**Files:**
- Create: apps/api/src/tables/tables.module.ts
- Create: apps/api/src/tables/tables.controller.ts
- Create: apps/api/src/tables/tables.dto.ts
- Create: apps/api/src/tables/tables.service.ts
- Create: apps/api/src/tables/tables-access.ts and its spec
- Modify: apps/api/src/app.module.ts
- Test: apps/api/test/tables.integration-spec.ts

**Interfaces:**
- GET /tables returns TableResponse[] scoped to AdminPrincipal.restaurantId.
- POST /tables accepts {name: string} and returns 201 TableResponse with a cryptographically random 32-byte base64url publicCode.
- GET /tables/{id} and PATCH /tables/{id} return TableResponse; PATCH accepts name and/or isActive. No physical delete endpoint is provided.
- TableResponse contains id, restaurantId, name, publicCode, isActive, createdAt, updatedAt and activeOrderCount; activeOrderCount counts PENDING, PREPARING and READY orders.
- OWNER/ADMIN can create, rename and deactivate/reactivate. STAFF can list and read only. Deactivation is allowed when orders exist.

- [ ] **Step 1: Write integration cases for unauthenticated access, OWNER CRUD, STAFF read-only access, duplicate names, deactivation with existing orders, and cross-tenant IDs. Run and verify expected failures.**
- [ ] **Step 2: Write the failing role helper tests: OWNER/ADMIN writes pass; STAFF writes throw ForbiddenException.**
- [ ] **Step 3: Implement DTO validation and tables-access.ts; names are trimmed, 1–80 characters, and empty names are rejected.**
- [ ] **Step 4: Implement the tenant-scoped service/controller. Generate publicCode with randomBytes(32).toString('base64url'); retry a unique collision up to three times, then fail safely. PATCH uses updateMany scoped by both id and restaurantId.**
- [ ] **Step 5: Run the table integration and role tests. Expected: only the owning restaurant sees the row; no delete operation exists; all role and duplicate-name expectations pass.**
- [ ] **Step 6: Commit as feat: add tenant-scoped table management.**

### Task 3: API autenticada de pedidos

**Files:**
- Create: apps/api/src/orders/orders.module.ts
- Create: apps/api/src/orders/orders.controller.ts
- Create: apps/api/src/orders/orders.dto.ts
- Create: apps/api/src/orders/orders.service.ts
- Create: apps/api/src/orders/order-status.ts and its spec
- Modify: apps/api/src/app.module.ts
- Test: apps/api/test/orders.integration-spec.ts

**Interfaces:**
- GET /orders accepts optional status and returns orders for the authenticated restaurant, newest first, including table name and item snapshots.
- GET /orders/summary returns exact counts for PENDING, PREPARING, READY, DELIVERED and CANCELLED orders.
- GET /orders/{id} returns one order only when its restaurantId matches the principal.
- PATCH /orders/{id}/status accepts {status: OrderStatus} and returns the updated order.
- Allowed transitions: PENDING to PREPARING or CANCELLED; PREPARING to READY or CANCELLED; READY to DELIVERED; DELIVERED and CANCELLED are terminal.
- OWNER, ADMIN and STAFF may read and advance or cancel orders within those transitions.

- [ ] **Step 1: Write integration cases for tenant-scoped listing/detail, status filtering, all allowed transitions, every invalid transition, and cross-tenant IDs. Run and verify failures.**
- [ ] **Step 2: Write failing unit cases for each transition and terminal state in order-status.spec.ts.**
- [ ] **Step 3: Implement canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean, list/detail/summary/update service methods. Use a transaction and conditional update on id, restaurantId and current status so concurrent status changes cannot overwrite one another.**
- [ ] **Step 4: Implement DTO and controller with AdminSessionGuard. Return 404 for an order outside the principal restaurant.**
- [ ] **Step 5: Run orders integration and transition unit tests. Expected: allowed transitions persist; invalid transitions return 409; other-tenant orders are not disclosed.**
- [ ] **Step 6: Commit as feat: add order queue and status transitions.**

### Task 4: API pública do QR, catálogo e criação/acompanhamento de pedidos

**Files:**
- Create: apps/api/src/public-dining/public-dining.module.ts
- Create: apps/api/src/public-dining/public-dining.controller.ts
- Create: apps/api/src/public-dining/public-dining.dto.ts
- Create: apps/api/src/public-dining/public-dining.service.ts
- Modify: apps/api/src/orders/orders.service.ts to expose createPublicOrder and listPublicOrderSummaries
- Modify: apps/api/src/orders/orders.module.ts to export OrdersService
- Modify: apps/api/src/auth/auth.module.ts to configure and export the named public-order throttler guard
- Modify: apps/api/src/app.module.ts
- Test: apps/api/test/public-dining.integration-spec.ts

**Interfaces:**
- GET /public/tables/{code}/menu returns {restaurant: {name}, table: {name}, categories: [{id, name, description, products: [{id, name, description, priceInCents, imageUrl, featured, dietaryTags, prepTimeMinutes}]}]}.
- POST /public/tables/{code}/orders accepts {items: [{productId, quantity, notes?}], notes?} and returns {id, status, totalInCents, createdAt, items: [{nameSnapshot, quantity, unitPriceInCents, lineTotalInCents}]}.
- GET /public/tables/{code}/orders returns at most 20 newest summaries with id, status, totalInCents, createdAt and item snapshots; it never returns customer identity or notes.
- Product quantity is 1–20; request has 1–50 items; order and item notes are at most 200 characters. Duplicate product IDs return 400 to avoid ambiguous notes.
- POST reloads the active table and same-restaurant active/available products inside a transaction, calculates prices from PostgreSQL and persists snapshots. Invalid/inactive table returns 404; invalid item returns 400 or 409 without partial writes.
- Public order submission uses the public-order throttle at 10 requests per minute per trusted client IP. It requires the BFF service credential but no admin session.

- [ ] **Step 1: Write PostgreSQL HTTP integration cases for a valid menu/order/summary flow, unknown and inactive codes, unavailable and cross-tenant products, forged price fields, duplicate products, quantity/note/payload limits, no partial writes, and absence of PII. Run and verify failures.**
- [ ] **Step 2: Implement menu query using only active tables and products where isActive=true and available=true; sort categories by displayOrder/name and products by name. Return only the declared response fields.**
- [ ] **Step 3: Implement createPublicOrder as one Prisma transaction; validate all item IDs and quantities, reject duplicate product IDs, calculate integer cent totals, and store name/price snapshots. Do not accept client price or total fields.**
- [ ] **Step 4: Implement listPublicOrderSummaries scoped by the resolved table id and limited to 20 newest orders.**
- [ ] **Step 5: Add the 10-per-minute named throttle keyed by a validated 64-character SHA-256 source header, falling back to request IP in local development. Protect POST with GatewaySecretGuard, not AdminSessionGuard; add DTO limits and OpenAPI decorators.**
- [ ] **Step 6: Run the full public-dining integration suite. Expected: no client price affects totals, snapshots remain unchanged after product edits, and summaries disclose no notes or personal data.**
- [ ] **Step 7: Commit as feat: add public QR ordering API.**

### Task 5: Seed local completo e documentação de uso

**Files:**
- Create: apps/api/prisma/seed-demo.ts
- Create: apps/api/prisma/seed-demo.integration-spec.ts
- Modify: apps/api/prisma/seed-owner.ts to return the restaurant id
- Modify: apps/api/prisma/seed.ts
- Modify: README.md and .env.example

**Interfaces:**
- seedOwner(prisma, config) returns Promise<{restaurantId: string}> and preserves the current explicit-owner upsert behavior.
- seedDemo(prisma, restaurantId) creates missing demo tables, categories and products within that restaurant only. It does not truncate or delete records.
- Seed set: Mesa 01–03; Hambúrgueres, Porções, Bebidas and Sobremesas; Smash clássico (2990), Cheeseburger da casa (3490), Batata rústica (1800), Anéis de cebola (1600), Refrigerante lata (700), Suco de laranja (1200), Brownie de chocolate (1400) and Pudim da casa (1000), all prices in centavos.

- [ ] **Step 1: Add PostgreSQL tests that run seedDemo twice, assert exactly three demo tables/four categories/eight demo products, preserve a custom table/category/product, and verify codes are stable. Run and verify failures.**
- [ ] **Step 2: Implement the demo seed in one transaction. Upsert only the known category set; create a sample product only when the same restaurant/category/name is absent, preserving existing product edits and all unrelated records.**
- [ ] **Step 3: Change seed.ts to run the protected owner seed then seedDemo for its restaurant. Retain parseSeedConfig's production, opt-in, loopback and credential checks unchanged.**
- [ ] **Step 4: Update README and .env.example descriptions so the seed documents all demo records, QR route, local login, migration and seed commands without committed credentials.**
- [ ] **Step 5: Run seed config tests, seed integration tests and git diff --check. Expected: second run adds no duplicates and the custom records remain byte-for-byte unchanged.**
- [ ] **Step 6: Commit as feat: seed local tables and menu.**

### Task 6: Cliente OpenAPI e rotas BFF Next.js

**Files:**
- Modify: apps/api/openapi.json and packages/api-client/src/generated/schema.d.ts through the repository generation command only
- Create: apps/web/src/lib/server/tables-api.ts and apps/web/src/lib/server/orders-api.ts
- Create: apps/web/src/lib/server/public-order-rate-limit.ts and its test
- Create: apps/web/src/app/api/admin/tables/[...segments]/route.ts and its route tests
- Create: apps/web/src/app/api/admin/orders/[...segments]/route.ts and its route tests
- Create: apps/web/src/app/api/public/tables/[code]/menu/route.ts and its route tests
- Create: apps/web/src/app/api/public/tables/[code]/orders/route.ts and its route tests
- Test: apps/web/src/app/api/admin/tables/[...segments]/__tests__/route.test.ts
- Test: apps/web/src/app/api/admin/orders/[...segments]/__tests__/route.test.ts
- Test: apps/web/src/app/api/public/tables/[code]/menu/__tests__/route.test.ts
- Test: apps/web/src/app/api/public/tables/[code]/orders/__tests__/route.test.ts

**Interfaces:**
- Admin BFF forwards only documented methods, query fields and body fields; it reads the HttpOnly admin-session cookie server-side and sends the token only to API_INTERNAL_URL.
- Admin mutations require isTrustedMutationOrigin, use no-store, reject unexpected bodies and cap request bodies at 16 KiB.
- Public menu BFF allows GET without a session. Public orders BFF allows GET and POST; POST requires a trusted mutation origin, the same body-size limit, strict field allowlists, no admin cookie forwarding, and the configured service gateway secret. Before forwarding POST, it limits 10 attempts per minute using the trusted client IP rules already used by the login gateway, and sends only its own SHA-256 client key to Nest.
- Every proxy uses a 5-second timeout, rejects redirects, validates table codes as 43 base64url characters and returns safe errors without leaking upstream internals.

- [ ] **Step 1: Write Jest tests for trusted-source rate limits and route behavior: unauthenticated admin access, trusted-origin enforcement, method/body allowlists, bad code/ID/query rejection, 16 KiB limit, safe errors, public menu without credentials, and public order POST with the service credential and generated client key only. Run and verify failures.**
- [ ] **Step 2: Generate the OpenAPI contract and client types with pnpm api:client:generate; inspect the generated paths and request/response types.**
- [ ] **Step 3: Implement typed server proxy functions using the existing catalog-api.ts/auth-cookie.ts conventions, with endpoint-specific allowlists and response headers.**
- [ ] **Step 4: Add the four Next route handlers and route tests; do not expose the service credential, Authorization header, source key or admin session cookie in browser responses.**
- [ ] **Step 5: Run route tests, pnpm api:client:check and web typecheck. Expected: generated client matches OpenAPI and all disallowed requests stop at the BFF.**
- [ ] **Step 6: Commit as feat: add table and order API gateways.**

### Task 7: Painel novo para visão geral, mesas e pedidos

**Files:**
- Create: apps/web/src/services/panel-tables.ts and apps/web/src/services/panel-orders.ts
- Create: apps/web/src/components/painel/OverviewWorkspace.tsx
- Create: apps/web/src/components/painel/mesas/TablesWorkspace.tsx, TableForm.tsx and TableQrDialog.tsx
- Create: apps/web/src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx
- Create: apps/web/src/components/painel/pedidos/OrdersWorkspace.tsx
- Create: apps/web/src/components/painel/pedidos/__tests__/OrdersWorkspace.test.tsx
- Create: apps/web/src/app/painel/(workspace)/mesas/page.tsx and pedidos/page.tsx
- Modify: apps/web/src/app/painel/(workspace)/page.tsx
- Modify: apps/web/src/components/painel/PainelShell.tsx
- Modify: apps/web/src/app/painel/painel.css
- Modify: apps/web/package.json and pnpm-lock.yaml to add qrcode.react 4.2.0

**Interfaces:**
- panel-tables exports listTables(), createTable({name}), updateTable(id, patch) and returns typed TableResponse values from the BFF.
- panel-orders exports listOrders(status?), updateOrderStatus(id, status) and returns typed order responses from the BFF.
- panel-orders exports getOrderSummary() returning the five status counts from /orders/summary.
- TablesWorkspace supports list/loading/error/empty states, add/rename, activate/deactivate, copy link and download SVG QR. TableQrDialog renders QRCodeSVG for the absolute /q/{publicCode} URL.
- OverviewWorkspace shows active table count and order counts from /orders/summary with shortcuts to catalog, tables and orders.
- OrdersWorkspace filters by all supported statuses and exposes only valid next actions from the allowed transition table.

- [ ] **Step 1: Read the current Next.js server/client component and route handler guides from apps/web/node_modules/next/dist/docs, as required by apps/web/AGENTS.md.**
- [ ] **Step 2: Write failing component tests for table lifecycle, permissions, QR link/download, order loading/error/empty states, status filters and invalid-transition actions. Run and verify failures.**
- [ ] **Step 3: Implement typed browser services and table/order workspaces, using existing Base UI/Radix primitives and lucide-react icons.**
- [ ] **Step 4: Add /painel/mesas and /painel/pedidos, connect nav links and role-aware access, and replace overview with counts and shortcuts. Load summary data through existing BFFs; keep the page usable when there are no records.**
- [ ] **Step 5: Add responsive styles for mobile and desktop, accessible dialogs/focus states, and prefers-reduced-motion behavior. Use QRCodeSVG with high contrast and sufficient quiet zone.**
- [ ] **Step 6: Run component tests, web lint and typecheck. Expected: OWNER/ADMIN mutations render; STAFF sees read-only tables and valid order controls; 360px viewport has no horizontal overflow.**
- [ ] **Step 7: Commit as feat: add table and order management screens.**

### Task 8: Cardápio QR público, carrinho e acompanhamento

**Files:**
- Create: apps/web/src/app/q/[code]/page.tsx
- Create: apps/web/src/components/public-menu/PublicMenu.tsx, MenuCart.tsx and OrderTracking.tsx
- Create: apps/web/src/components/public-menu/__tests__/PublicMenu.test.tsx
- Create: apps/web/src/services/public-dining.ts
- Create: apps/web/src/components/public-menu/public-menu.css

**Interfaces:**
- public-dining exports getPublicMenu(code), submitPublicOrder(code, payload) and listPublicOrderSummaries(code), all using the same-origin BFF.
- CartLine stores productId, quantity and optional notes; storage key is comandinha:qr-cart:{code}. Only product IDs/quantities/notes are persisted; current prices are refreshed from the API.
- Successful submission clears the cart and stores returned order id in comandinha:qr-last-order:{code} for confirmation/tracking. Failed submission leaves the cart intact and exposes an accessible retry message.
- OrderTracking polls GET summaries every 10 seconds only while the page is visible, displays only the stored order id, stops after DELIVERED/CANCELLED or unmount, and never displays another table's orders.

- [ ] **Step 1: Write failing Jest tests for loading the menu, category navigation, cart totals, storage keyed per code, server price refresh, submit lock, cart preservation on error, success confirmation and tracking stop conditions. Run and verify failures.**
- [ ] **Step 2: Implement public-dining browser service with typed OpenAPI responses and strict error states.**
- [ ] **Step 3: Implement menu and cart components. Keep totals informational until server confirmation; submit only product IDs, quantities and notes. Disable the submit action while pending.**
- [ ] **Step 4: Implement order confirmation and 10-second visibility-aware tracking with cleanup and polite live-region updates.**
- [ ] **Step 5: Implement /q/[code] as a client experience with server page metadata set noindex and a not-found/error state for invalid codes. Keep /mesa/[uuid] untouched.**
- [ ] **Step 6: Add mobile-first coral/plum styling, fixed cart CTA that respects safe-area insets, keyboard-accessible category/cart controls, focus states and reduced motion.**
- [ ] **Step 7: Run PublicMenu tests, web lint and typecheck. Expected: no hydration errors; cart survives reload but not a table-code change; failed order keeps all cart lines.**
- [ ] **Step 8: Commit as feat: add public QR menu and order tracking.**

### Task 9: Fluxo ponta a ponta, documentação final e validação

**Files:**
- Create: apps/web/e2e/painel-dining.spec.ts
- Modify: README.md

- [ ] **Step 1: Write Playwright flow for login, QR link opening, product selection, cart submission, status advance in /painel/pedidos, and public tracking update. Use deterministic API mocks; API behavior remains covered by PostgreSQL integration tests.**
- [ ] **Step 2: Add viewport checks at 360x800, 768x1024 and 1440x900 for the public menu and panel; assert no horizontal overflow and test reduced motion.**
- [ ] **Step 3: Add a compatibility assertion that /admin and /mesa/[uuid] remain reachable with their existing API calls mocked. Run the E2E suite and verify both legacy paths.**
- [ ] **Step 4: Finish README instructions for migrate, seed, login, opening /painel/mesas, scanning /q/{code}, submitting a sample order and advancing its status.**
- [ ] **Step 5: Run API unit/integration/E2E tests, web Jest/Playwright/lint/typecheck, pnpm api:client:check, and root build. Expected: all pass against local PostgreSQL; no remote operation runs.**
- [ ] **Step 6: Run git diff --check, verify .env remains ignored and absent from the staged diff, and commit only final E2E/docs changes as test: verify local QR order journey.**

## Coverage review

- Data model and migration: Task 1.
- Table management and tenant isolation: Task 2.
- Authenticated order queue and valid transitions: Task 3.
- Public QR catalog, price authority, snapshots and privacy: Task 4.
- Protected idempotent local seed and setup docs: Task 5.
- OpenAPI, typed client and same-origin boundaries: Task 6.
- Overview, tables, QR display and order management UI: Task 7.
- Mobile-first menu, cart, submission and tracking: Task 8.
- Full browser journey, compatibility and release checks: Task 9.
