# Comandinha Parallel Admin Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new session-protected `/painel` area where restaurant owners and admins manage categories and products through NestJS, while the legacy `/admin` remains operational.

**Architecture:** PostgreSQL stores tenant-scoped catalog records. NestJS owns validation, authorization, business rules, and the OpenAPI contract. Next Route Handlers proxy a strict allowlist to Nest with the opaque session from the HttpOnly cookie. A separate App Router route group protects `/painel`; its desktop-first catalog UI adapts to mobile and tablet.

**Tech Stack:** Node.js 24, Next.js 16, React 19, NestJS 12, Prisma 7, PostgreSQL 18, TypeScript strict, generated `@comandinha/api-client`, Jest, Vitest, and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-comandinha-parallel-admin-catalog-design.md`

## Global Constraints

- Keep all existing `/admin` routes, legacy login, localStorage token flow, and legacy data calls operational.
- Do not read or migrate the legacy SQLite database or legacy accounts/data.
- Derive `restaurantId` and role only from the authenticated Nest session principal; never accept them as trusted client input.
- Keep the session secret in the HttpOnly cookie and server-side handlers only; validate Origin on mutations.
- Categories and products in the new database do not feed the public legacy menu in this milestone.
- Persist prices as positive integer cents. Use normalized category names unique per restaurant and prevent cross-tenant product/category relations.
- Category deletion with products returns `409`; product deletion archives and can be reversed by an authorized update.
- Accept only optional HTTPS image URLs; file upload and media storage are out of scope.
- Admin UI is desktop-first and must remain complete at 360×800, 768×1024, and 1440×900. Honor `prefers-reduced-motion`.
- Keep DTOs and service calls aligned with generated OpenAPI types. Do not add a shared UI package or new UI runtime dependency.
- Do not deploy or provision production resources. On 2026-10-13 the user authorized single-responsibility commits, pushing this branch, and opening pull requests against `develop` and `master`.

## Review Focus

- A user from restaurant B cannot read or mutate restaurant A's catalog, even with known UUIDs or a category UUID in a product request; assert this in PostgreSQL integration tests.
- `STAFF` can read but cannot create, edit, archive, or delete; assert the Nest API returns `403` for every mutation class.
- A browser cannot bypass the HttpOnly session, mutate without a trusted Origin, choose a tenant, or cause arbitrary headers/path forwarding; assert these at the Next Route Handler boundary.
- A category with products cannot be deleted and product archives remain discoverable/restorable; assert API and UI behavior.
- Decimal input, malformed URLs, oversized bodies, missing sessions, and API outages produce bounded validation/error behavior without leaking secrets or stack traces.

---

### Task 1: Write failing PostgreSQL catalog acceptance tests

**Files:**
- Create: `apps/api/test/catalog.integration-spec.ts`
- Reuse: `apps/api/src/auth/session-token.ts`, `apps/api/prisma/seed-owner.ts`, and the existing PostgreSQL integration setup patterns.

**Interfaces:**
- The test starts the Nest app with the same `ValidationPipe` and `configureOpenApi` setup used by `auth.integration-spec.ts`.
- Test helpers create two restaurants, an owner/admin per restaurant, and a `STAFF` membership; they obtain opaque sessions through `POST /auth/sessions`.

- [x] **Step 1: Add integration cases for the catalog contract**

Cover: unauthenticated list returns `401`; owner CRUD succeeds; a duplicate category name after trim/NFKC/lowercase normalization returns `409`; staff reads but receives `403` on create/update/archive/category-delete/product-delete; a forged `restaurantId` in a request body is rejected; another restaurant's category/product IDs return `404`; a product cannot reference another tenant's category; deleting a category with any associated product returns `409`; archiving hides a product from the default list and `includeArchived=true` exposes it for restoration. Only `OWNER` and `ADMIN` may request archived records.

- [x] **Step 2: Run the new integration file and confirm the expected red state**

Run against a local test PostgreSQL database only: `pnpm --filter @comandinha/api exec vitest run --config vitest.config.integration.ts test/catalog.integration-spec.ts`
Expected: the new `/catalog/*` paths currently return `404`; fixture setup and test compilation succeed.

---

### Task 2: Add tenant-safe catalog persistence

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261013143831_catalog_categories_and_products/migration.sql`
- Generate: Prisma client in `apps/api/src/generated/prisma/**`

**Interfaces:**
- `CatalogCategory`: UUID, `restaurantId`, `name`, `nameNormalized`, optional `description` and `imageUrl`, nonnegative `displayOrder`, timestamps, and category/product relations.
- `CatalogProduct`: UUID, `restaurantId`, `categoryId`, `name`, optional `description`, `priceInCents`, optional `imageUrl`, `available`, `featured`, `dietaryTags`, optional `prepTimeMinutes`, `isActive`, and timestamps.
- Store `nameNormalized` as NFKC-normalized, trimmed, lowercase text. Add uniqueness on `[restaurantId, nameNormalized]`.
- Add a composite category key `[id, restaurantId]` and a product relation on `[categoryId, restaurantId]` so PostgreSQL rejects cross-tenant relations; category deletion uses `Restrict`.
- Index category and product reads by restaurant, active state, and display order/category as appropriate.

- [x] **Step 1: Add the catalog models and relations to the Prisma schema**

- [x] **Step 2: Generate a create-only migration and inspect it**

First verify that `DATABASE_URL` points to the local Compose PostgreSQL host (`localhost`, `127.0.0.1`, or `::1`); never run this migration command with a production URL. Then run: `pnpm --filter @comandinha/api exec prisma migrate dev --name catalog_categories_and_products --create-only`
Expected: the migration creates only the two catalog tables, their tenant-safe foreign keys, unique constraints, and indexes; existing tables/data are not dropped or rewritten.

- [x] **Step 3: Apply the migration to the local test database and regenerate Prisma Client**

With the same verified loopback-only `DATABASE_URL`, run: `pnpm --filter @comandinha/api prisma:migrate` then `pnpm --filter @comandinha/api prisma:generate`
Expected: migration succeeds and generated types expose both catalog models.

---

### Task 3: Implement the NestJS catalog API and domain rules

**Files:**
- Create: `apps/api/src/catalog/catalog.module.ts`
- Create: `apps/api/src/catalog/catalog.controller.ts`
- Create: `apps/api/src/catalog/catalog.service.ts`
- Create: `apps/api/src/catalog/catalog.dto.ts`
- Create: `apps/api/src/catalog/catalog-access.ts` and focused specs
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/catalog.integration-spec.ts`

**Interfaces:**
- `CatalogService` methods receive `AdminPrincipal` for every read or mutation and derive its `restaurantId` internally.
- `assertCatalogWriteAccess(role)` allows `OWNER` and `ADMIN`, and rejects `STAFF` with `ForbiddenException`.
- REST paths use `/catalog/categories` and `/catalog/products`; IDs are UUIDs. Create/update DTOs never contain `restaurantId`.
- Category list returns `productCount` counting active and archived products; product list defaults to active products and accepts `categoryId` plus `includeArchived=true` only for `OWNER`/`ADMIN`.
- Category normalization is `name.normalize('NFKC').trim().toLowerCase()` and uniqueness errors map to `409`.
- Product prices are validated as positive integer cents. Names are limited to 120 characters, descriptions to 2,000 characters, URLs to 2,048 characters, dietary tags to 20 entries of at most 60 characters, and preparation time to 1–1,440 minutes. `imageUrl` accepts only absolute HTTPS URLs. Category references must belong to the principal's restaurant.
- `displayOrder` is bounded to PostgreSQL's signed `Int` maximum. Optional create fields with database defaults remain optional in generated client types. `PATCH` uses `null` to clear nullable descriptions, image URLs, and preparation time; dietary tags use `[]`; `null` is rejected for other optional fields.
- `DELETE /catalog/products/{id}` sets `isActive=false`; `PATCH` can explicitly restore it. Category deletion checks for associated products and returns `409` without cascading.

- [x] **Step 1: Add failing unit tests for category normalization and role access**

Assert NFKC/trim/lowercase normalization produces the expected key, and `OWNER`/`ADMIN` pass while `STAFF` throws `ForbiddenException`.

- [x] **Step 2: Run the focused specs and verify the expected failures**

Run: `pnpm --filter @comandinha/api exec vitest run src/catalog/catalog-access.spec.ts`
Expected: tests fail because the access helper and normalizer do not exist.

- [x] **Step 3: Implement DTOs, access helper, service, controller, and module**

Register `CatalogModule` in `AppModule`, apply `AdminSessionGuard` at the controller boundary, and document status codes and schemas with Nest Swagger decorators.

- [x] **Step 4: Run catalog unit and PostgreSQL integration tests**

Run: `pnpm --filter @comandinha/api exec vitest run src/catalog` and `pnpm --filter @comandinha/api exec vitest run --config vitest.config.integration.ts test/catalog.integration-spec.ts`
Expected: domain specs and all catalog acceptance cases pass, including cross-tenant access, role boundaries, category delete conflicts, and archive restoration.

---

### Task 4: Regenerate and verify the OpenAPI client

**Files:**
- Generate: `apps/api/openapi.json`
- Generate: `packages/api-client/src/generated/schema.d.ts`
- Verify: `packages/api-client` consumer types

**Interfaces:**
- Generated operations expose exact request/response types for category and product CRUD, including integer-cent fields, `productCount`, `includeArchived`, and stable error responses.
- Create DTOs preserve database defaults without turning optional fields into required client properties; update DTOs describe nullable clear operations explicitly.
- The frontend and BFF import generated operation types rather than defining parallel DTOs.

- [x] **Step 1: Export OpenAPI and regenerate the TypeScript client**

Run: `pnpm api:client:generate`
Expected: generated files include all catalog routes and no unrelated API operation disappears.

- [x] **Step 2: Check generated drift and downstream type consumers**

Run: `pnpm api:client:check` and `pnpm --filter @comandinha/api-client test:consumer`
Expected: both commands pass with no hand-maintained duplicate request/response types.

---

### Task 5: Add the same-origin catalog proxy in Next.js

**Files:**
- Create: `apps/web/src/lib/server/catalog-api.ts`
- Create: `apps/web/src/app/api/admin/catalog/[...segments]/route.ts`
- Create: `apps/web/src/app/api/admin/catalog/[...segments]/__tests__/route.test.ts`
- Reuse: `apps/web/src/lib/server/auth-cookie.ts` and `auth-response.ts`

**Interfaces:**
- `proxyCatalogRequest(request: Request, segments: string[]): Promise<Response>` maps only the allowed catalog paths and HTTP methods to fixed Nest paths under `API_INTERNAL_URL`.
- It reads the session via `readAdminSessionCookie()`, sends only `Authorization: Bearer <opaque-session>` and JSON content headers to Nest, and never includes the session in its browser response.
- Mutation requests require `isTrustedMutationOrigin(request)`. JSON bodies are streamed with a 64 KiB cap. Unknown paths, methods, query keys, or tenant fields are rejected; upstream `Set-Cookie`, stack traces, and arbitrary headers are not forwarded.
- Query allowlist: `categoryId` and `includeArchived`; resource IDs must be UUIDs. Upstream status and safe JSON DTOs are preserved with `Cache-Control: no-store`; errors use a closed message allowlist so stack traces and arbitrary internal details cannot leak through `message`.

- [x] **Step 1: Write failing Route Handler tests for session, Origin, body and path boundaries**

Assert missing cookie returns `401`; mismatched/missing Origin blocks every mutation before fetch; oversized/non-JSON bodies fail before fetch; only allowlisted path/method/query/body fields are forwarded; browser-supplied tenant/authorization headers are ignored; the cookie token is forwarded only server-side; upstream `Set-Cookie` and sensitive error detail are omitted.

- [x] **Step 2: Run the focused handler tests and confirm they fail for missing proxy behavior**

Run: `pnpm --filter @comandinha/web exec jest --runInBand "src/app/api/admin/catalog"`
Expected: tests fail because the new handler does not exist.

- [x] **Step 3: Implement the allowlisted proxy and safe error mapping**

Use the generated `ApiPaths` contract at the TypeScript boundary. Keep business rules in Nest, map API outages to a bounded `502` response, and do not log session tokens or request bodies.

- [x] **Step 4: Run handler tests and the web typecheck**

Run: `pnpm --filter @comandinha/web exec jest --runInBand "src/app/api/admin/catalog"` and `pnpm --filter @comandinha/web typecheck`
Expected: handler tests and typecheck pass.

---

### Task 6: Build the isolated `/painel` session shell and login

**Files:**
- Create: `apps/web/src/app/painel/layout.tsx`
- Create: `apps/web/src/app/painel/(auth)/login/page.tsx`
- Create: `apps/web/src/app/painel/(workspace)/layout.tsx`
- Create: `apps/web/src/app/painel/(workspace)/page.tsx`
- Create: `apps/web/src/components/painel/PainelSessionGate.tsx`
- Create: `apps/web/src/components/painel/PainelLoginForm.tsx`
- Create: `apps/web/src/components/painel/PainelShell.tsx`
- Create: `apps/web/e2e/painel-catalog.spec.ts`
- Create: focused UI tests
- Reuse: existing `/api/auth/*` Route Handlers and session helpers

**Interfaces:**
- The parallel route group does not inherit `app/admin/layout.tsx`, `AdminLayoutClient`, `AuthGuard`, or legacy `useAuth`.
- `PainelSessionGate` calls `GET /api/auth/session`, which reads the HttpOnly cookie and clears it when Nest returns `401`. It renders protected children only after a valid session; `401` redirects to `/painel/login`, while `502`/`503` show a retryable unavailable state without falsely logging out. Do not mutate cookies from a Server Component.
- The login form posts `{ email, password, restaurantSlug? }` to `/api/auth/login`; it handles invalid credentials, rate limits, service outage, and `RESTAURANT_SELECTION_REQUIRED` by asking the user to choose a membership slug.
- Successful login navigates to `/painel/catalogo`. No public registration is offered. Logout calls `DELETE /api/auth/session` and redirects to `/painel/login`.
- The shell renders safe user/restaurant metadata and provides a link to the existing admin; it never reads or writes auth tokens in browser storage.

- [x] **Step 1: Add failing login UI tests and the Playwright user-flow test**

Assert the login sends the expected same-origin body, never renders a session token, shows generic credential/rate-limit/service errors, and resubmits with the selected restaurant slug after a `409` selection response. Add `e2e/painel-catalog.spec.ts` using Playwright route stubs for the same-origin auth and catalog HTTP boundaries; cover login, create category, create product, update availability, archive/restore, and logout.

- [x] **Step 2: Add failing tests for the session gate and logout behavior**

Cover `401` redirect, valid membership metadata in the shell, API outage showing retry without logging out, and logout revocation through the same-origin route. Existing session Route Handler tests cover invalid-cookie clearing.

- [x] **Step 3: Run the focused UI tests and verify the expected failures**

Run: `pnpm --filter @comandinha/web exec jest --runInBand "src/app/painel" "src/components/painel"` and `pnpm --filter @comandinha/web test:e2e -- e2e/painel-catalog.spec.ts`
Expected: Jest tests fail because the route group/components do not exist, and Playwright reports the missing `/painel` flow.

- [x] **Step 4: Implement the independent route groups, client session gate, login and shell**

Keep route metadata and route composition server-side; use the session gate only for client state and logout interaction. The API remains authoritative for every catalog request. Add `noindex,nofollow` metadata to all panel pages.

- [x] **Step 5: Run the focused UI tests and web typecheck**

Run: `pnpm --filter @comandinha/web exec jest --runInBand "src/app/painel" "src/components/painel"` and `pnpm --filter @comandinha/web typecheck`
Expected: all new tests pass and `/admin` tests remain unchanged.

---

### Task 7: Build the desktop-first, responsive catalog UI

**Files:**
- Create: `apps/web/src/services/catalog.ts`
- Create: `apps/web/src/components/painel/catalogo/CatalogWorkspace.tsx`
- Create: `apps/web/src/components/painel/catalogo/ProductForm.tsx`
- Create: `apps/web/src/components/painel/catalogo/CategoryForm.tsx`
- Create: `apps/web/src/components/painel/catalogo/PriceField.tsx` and tests
- Create: `apps/web/src/app/painel/(workspace)/catalogo/page.tsx`
- Create: focused catalog UI tests

**Interfaces:**
- Service functions use `/api/admin/catalog` same-origin routes and generated API types; they do not import the legacy Axios `api` service or use localStorage.
- `parsePriceToCents(value: string): number` accepts Brazilian decimal input such as `12,34`, rejects invalid or nonpositive values, and returns exact integer cents.
- Catalog view supports Products/Categories tabs, search, loading/empty/error states, create/edit forms, availability/featured toggles, category product counts, blocked category deletion messaging, archived-product filtering/restoration, and role-aware read-only behavior for `STAFF`.
- Editing can explicitly clear nullable metadata; both forms disable actions while saving and guard against duplicate submissions.
- Forms send `imageUrl` only when it is an absolute HTTPS URL. Browser validation is for feedback; Nest remains authoritative.
- Use the existing Comandinha color tokens and existing UI controls. Keep transitions short and disable nonessential motion under `prefers-reduced-motion`; no new UI runtime dependency.

- [x] **Step 1: Add failing tests for exact price parsing and form validation**

Assert `"12,34" → 1234`, `"0,01" → 1`, and `"1.234,56" → 123456`; reject empty, malformed, non-finite, or nonpositive values; assert non-HTTPS image URLs are rejected before submission.

- [x] **Step 2: Run the price/form tests and verify the expected failures**

Run: `pnpm --filter @comandinha/web exec jest --runInBand "src/components/painel/catalogo"`
Expected: tests fail because parsing and catalog form behavior are not implemented.

- [x] **Step 3: Implement the typed catalog service and price field**

Keep form values as strings until exact cent conversion at submit time. Map API DTOs only where existing Portuguese display types are required; do not weaken generated API types with `any`.

- [x] **Step 4: Add failing tests for catalog loading, CRUD feedback and read-only roles**

Cover empty/error/loading states, product availability update, archive/restore, blocked category deletion, category selection, and `STAFF` having no mutation controls.

- [x] **Step 5: Implement the catalog workspace and responsive forms**

Use a dense table/list on desktop and stacked cards/forms on mobile; preserve all actions at narrow widths and accessible labels/focus states.

- [x] **Step 6: Run catalog UI tests and inspect the three target viewports**

Run: `pnpm --filter @comandinha/web exec jest --runInBand "src/components/painel/catalogo"`
Expected: tests pass; browser inspection at 360×800, 768×1024, and 1440×900 shows no clipped controls or horizontal page scroll. Verify keyboard navigation and reduced-motion behavior.

---

### Task 8: Document the migration boundary and verify the complete slice

**Files:**
- Modify: `README.md` and `docs/adr/0002-admin-sessions-and-tenant-context.md` only if the operational boundary changes
- Modify: `docs/superpowers/plans/2026-10-13-comandinha-parallel-admin-catalog.md` as steps complete

**Interfaces:**
- Playwright exercises login, create category, create product, update availability, archive/restore product, and logout through the new UI using the same-origin boundary stubs added in Task 6. API persistence and tenant behavior remain proven by real PostgreSQL integration tests.
- README documents `/painel`, local seed login, the separation between new catalog and legacy menu, and that no legacy data has been copied.

- [x] **Step 1: Run the new-panel Playwright flow against the completed UI**

Run: `pnpm --filter @comandinha/web test:e2e -- e2e/painel-catalog.spec.ts`
Expected: the complete login and catalog journey passes at the browser/UI boundary.

- [x] **Step 2: Document the new route and transitional data boundary**

Update README and its doc checks with `pnpm test:docs`. Be explicit that `/admin` remains legacy and the new catalog is not yet consumed by the public menu.

- [x] **Step 3: Run full repository verification**

Run: `pnpm test`, `pnpm test:integration`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm api:client:check`
Expected: all commands exit successfully; report existing unrelated legacy warnings without expanding scope.

- [x] **Step 4: Inspect the final diff and request review**

Run `git diff --check`; inspect the Prisma migration, OpenAPI/generated types, security boundaries, mobile/tablet layouts, and verify no session/gateway secrets appear under `apps/web/.next/static`. Do not deploy. After the final review, create single-responsibility commits, push the feature branch, and open pull requests against `develop` and `master` as explicitly authorized by the user.
