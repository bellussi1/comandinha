# Comandinha Mobile MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local seeded Comandinha flow dependable and comfortable to use on mobile, from catalog and table setup through QR ordering and order handling.

**Architecture:** Keep the existing Next.js, NestJS, Prisma and PostgreSQL boundaries. Isolate the Playwright Next server from the developer server, make the operation screens easier to use at narrow widths, cover recoverable mutation failures, and defer QR rendering code until the operator asks to open a QR.

**Tech Stack:** Next.js 16.4, React 19, TypeScript 6, NestJS 12, Prisma 7, PostgreSQL 18, Playwright 1.64, Jest and Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-comandinha-mobile-mvp-design.md`

## Global Constraints

- This milestone is a local seeded MVP and does not declare production readiness.
- Verify mobile layouts at 320, 360 and 768 CSS px; verify desktop composition at 1440 CSS px.
- Preserve the coral/plum identity and current UI dependencies; add no UI or animation library.
- Keep `/admin` and `/mesa/[token]` available and compatible during migration.
- Preserve local seed guardrails, server-side product/price validation, tenant isolation and order snapshots.
- Keep keyboard access, visible focus, legible contrast and `prefers-reduced-motion` support.
- Do not add fixed credentials, public demo data, payment, waiter calls or offline/real-time promises.
- Before changing Next.js code, read the relevant local guide under `apps/web/node_modules/next/dist/docs/` as required by `apps/web/AGENTS.md`.

## Review Focus

- A second Next process must start on port 3100 while the normal development server is already active on port 3000; Task 1 proves output directories do not conflict.
- At 320 px, editors, status filters, order actions and QR dialogs must remain visible, tappable and inside the viewport; Task 2 pins this in browser tests.
- When API mutations are delayed or fail, buttons must prevent duplicate requests and users must retain entered data and a clear retry path; Task 3 tests this behavior.
- The QR renderer must not be part of the initial tables interaction cost and must still open correctly on demand; Task 4 tests initial load and click behavior.
- STAFF remains read-only, invalid server transitions remain rejected, and legacy routes remain reachable; Task 5 runs existing API/PostgreSQL and legacy-route integration suites.

---

### Task 1: Isolate the Playwright Next.js server

**Files:**
- Modify: `apps/web/next.config.mjs`
- Modify: `apps/web/playwright.config.ts`
- Test: `apps/web/e2e/foundation.spec.ts`, `apps/web/e2e/painel-catalog.spec.ts`, `apps/web/e2e/painel-dining.spec.ts`, `apps/web/e2e/design-accessibility.spec.ts`

**Interfaces:**
- Consumes: the existing `COMANDINHA_WEB_DIST_DIR`-free default Next output at `.next` and the Playwright server on port 3100.
- Produces: an opt-in `COMANDINHA_WEB_DIST_DIR` config value; regular `pnpm dev` continues to use `.next`, while Playwright uses a dedicated ignored directory.

- [ ] **Step 1: Reproduce the existing collision**

Run: `pnpm --filter @comandinha/web test:e2e` while the normal web dev server is listening on port 3000.

Expected: the current failure reports that another Next dev server is running and identifies the 3000 process.

- [ ] **Step 2: Configure a dedicated Playwright output directory**

In `apps/web/next.config.mjs`, set `distDir` to `process.env.COMANDINHA_WEB_DIST_DIR ?? '.next'`. In `apps/web/playwright.config.ts`, set `COMANDINHA_WEB_DIST_DIR` to `.next-playwright` in `webServer.env`; retain port 3100 and the existing `baseURL`.

- [ ] **Step 3: Run the browser suite beside the normal dev server**

Run: `pnpm --filter @comandinha/web test:e2e`.

Expected: all four existing specs start and pass; the server on port 3000 stays available and its `.next` output is untouched by Playwright.

- [ ] **Step 4: Commit the isolated test-server change**

```bash
git add apps/web/next.config.mjs apps/web/playwright.config.ts
git commit -m "test(web): isolate Playwright Next output"
```

### Task 2: Make panel actions comfortable on mobile

**Files:**
- Modify: `apps/web/src/app/painel/painel.css`
- Modify: `apps/web/e2e/painel-catalog.spec.ts`
- Modify: `apps/web/e2e/painel-dining.spec.ts`

**Interfaces:**
- Consumes: existing catalog/table/order routes, their mock API responses, and current visual tokens.
- Produces: browser-tested mobile creation/editing and a minimum 44 CSS px height for order filters and primary order actions.

- [ ] **Step 1: Add mobile assertions before changing styles**

In `painel-catalog.spec.ts`, exercise the first-category and first-product editors at 320 px. Assert each dialog stays within the viewport, the document has no horizontal overflow, and the primary save button is at least 44 CSS px high.

In `painel-dining.spec.ts`, extend the existing table route mock to support create and rename. At 320 px create and rename a table, assert the editor stays within the viewport, and verify its primary actions are at least 44 CSS px high. On `/painel/pedidos`, assert every status-filter and order-action button is at least 44 CSS px high.

- [ ] **Step 2: Run the targeted browser tests and confirm the current gap**

Run: `pnpm --filter @comandinha/web exec playwright test e2e/painel-catalog.spec.ts e2e/painel-dining.spec.ts`.

Expected: the new checks identify any undersized order controls or mobile editor overflow before CSS changes.

- [ ] **Step 3: Adjust only the failing mobile rules**

Update the relevant narrow-screen rules in `painel.css` so editor dialogs fit within 320 px and status filters/order actions reach at least 44 CSS px without making the page overflow horizontally. Keep the existing tokens, spacing rhythm and desktop layout.

- [ ] **Step 4: Inspect mobile captures and rerun the targeted browser tests**

Run: `pnpm --filter @comandinha/web exec playwright test e2e/painel-catalog.spec.ts e2e/painel-dining.spec.ts`.

Expected: the flows work at 320, 360, 768 and 1440 px; inspect the captured 320/360 screenshots for clipped labels, cramped dialogs and obstructed actions.

- [ ] **Step 5: Commit the mobile panel change**

```bash
git add apps/web/src/app/painel/painel.css apps/web/e2e/painel-catalog.spec.ts apps/web/e2e/painel-dining.spec.ts
git commit -m "fix(web): improve mobile panel controls"
```

### Task 3: Preserve context after operational write failures

**Files:**
- Modify: `apps/web/src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx`
- Modify: `apps/web/src/components/painel/pedidos/__tests__/OrdersWorkspace.test.tsx`
- Modify implementation files only if a new regression test fails: `apps/web/src/components/painel/mesas/TableForm.tsx`, `apps/web/src/components/painel/mesas/TablesWorkspace.tsx`, `apps/web/src/components/painel/pedidos/OrdersWorkspace.tsx`

**Interfaces:**
- Consumes: existing `createTable`, `updateTable`, `listOrders` and `updateOrderStatus` service interfaces.
- Produces: tested retry behavior that keeps form values and order context after a failed write and prevents repeated submission while pending.

- [ ] **Step 1: Add the failing table-save recovery test**

Add `keeps the table editor and name after a failed save, then retries successfully` to `TablesWorkspace.test.tsx`. Reject the first `createTable`, assert the entered name and alert remain visible, retry, then assert the new table appears and the dialog closes.

- [ ] **Step 2: Run the table test and verify its result**

Run: `pnpm --filter @comandinha/web test -- --runInBand src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx`.

Expected: the test proves the current behavior or fails on the precise lost-context/retry gap.

- [ ] **Step 3: Add the failing order-transition recovery test**

Add `keeps the order and allows retry after a failed status update` to `OrdersWorkspace.test.tsx`. Reject the first update, assert the order remains pending, the alert is announced and the button is enabled again; resolve the second update and assert the status advances.

- [ ] **Step 4: Run the order test and verify its result**

Run: `pnpm --filter @comandinha/web test -- --runInBand src/components/painel/pedidos/__tests__/OrdersWorkspace.test.tsx`.

Expected: the test proves the current behavior or identifies the exact recovery gap.

- [ ] **Step 5: Implement only behavior missing from the recovery tests**

Keep errors associated with the form or order that produced them. Preserve entered names and current order data, announce failures with `role="alert"`, and disable only the affected write action until its request settles.

- [ ] **Step 6: Run both targeted unit suites and commit**

Run: `pnpm --filter @comandinha/web test -- --runInBand src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx src/components/painel/pedidos/__tests__/OrdersWorkspace.test.tsx`.

```bash
git add apps/web/src/components/painel/mesas apps/web/src/components/painel/pedidos
git commit -m "fix(web): preserve panel context after write errors"
```

### Task 4: Load QR rendering only when requested

**Files:**
- Modify: `apps/web/src/components/painel/mesas/TablesWorkspace.tsx`
- Modify: `apps/web/src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx`
- Modify: `apps/web/e2e/painel-dining.spec.ts`
- Existing focused module: `apps/web/src/components/painel/mesas/TableQrDialog.tsx`

**Interfaces:**
- Consumes: the current `PanelTable` type and `TableQrDialog` props `{ table, publicUrl, onOpenChange }`.
- Produces: a tables page that dynamically imports the QR dialog after a user selects **Ver QR**, then renders the same accessible dialog and actions.

- [ ] **Step 1: Add a browser assertion for on-demand loading**

In `painel-dining.spec.ts`, record script requests before navigating to `/painel/mesas`. Assert the page loads without a QR-specific async chunk; click **Ver QR**, wait for the dialog and SVG, then assert an additional script chunk loaded after the interaction.

- [ ] **Step 2: Run the targeted Playwright test and confirm the current eager import**

Run: `pnpm --filter @comandinha/web exec playwright test e2e/painel-dining.spec.ts`.

Expected: the new assertion fails because `TablesWorkspace.tsx` statically imports `TableQrDialog.tsx` and `qrcode.react`.

- [ ] **Step 3: Add an interaction-triggered dynamic import**

Replace the static import in `TablesWorkspace.tsx` with `import('./TableQrDialog')` inside the QR-open action. Keep the current QR URL, dialog behavior and download/copy actions. Expose a short pending state on the selected **Ver QR** button while the chunk loads; if import fails, keep the table list usable and show a retryable inline error.

- [ ] **Step 4: Run QR and mobile journey tests**

Run: `pnpm --filter @comandinha/web exec playwright test e2e/painel-dining.spec.ts` and `pnpm --filter @comandinha/web test -- --runInBand src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx`.

Expected: QR rendering loads after the user asks for it; 320 px QR bounds, link copy, SVG download, focus and reduced-motion checks pass.

- [ ] **Step 5: Commit the QR loading change**

```bash
git add apps/web/src/components/painel/mesas/TablesWorkspace.tsx apps/web/src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx apps/web/e2e/painel-dining.spec.ts
git commit -m "perf(web): defer table QR rendering"
```

### Task 5: Verify the complete local MVP and compatibility boundary

**Files:**
- No product code changes expected; fix only test failures introduced by Tasks 1–4.
- Verify: `apps/api/test/catalog.integration-spec.ts`, `apps/api/test/tables.integration-spec.ts`, `apps/api/test/orders.integration-spec.ts`, `apps/api/test/public-dining.integration-spec.ts`, `apps/web/e2e/painel-dining.spec.ts`, `apps/web/e2e/foundation.spec.ts`.

**Interfaces:**
- Consumes: the approved local `.env`, loopback PostgreSQL and the existing local seed; the Playwright server from Task 1.
- Produces: verified local setup and regression evidence for the seeded QR flow, tenant/security rules and legacy route availability.

- [ ] **Step 1: Check integration-test target before running tests**

Verify the configured `DATABASE_URL` host/port is loopback without printing credentials or the full URL. Confirm the configured local database is the Comandinha development database before running integration tests.

- [ ] **Step 2: Run API/PostgreSQL integration and browser suites**

Run: `pnpm test:integration`.

Expected: API/PostgreSQL tests, mobile Playwright flows and legacy-route checks pass; test fixtures remove only records created by those tests.

- [ ] **Step 3: Verify lint, types and unit tests**

Run: `pnpm lint`, `pnpm typecheck` and `pnpm test`.

Expected: all commands pass; the existing legacy hook warnings do not increase.

- [ ] **Step 4: Build web assets in an isolated output directory**

Run in PowerShell:

```powershell
$env:COMANDINHA_WEB_DIST_DIR = '.next-mobile-mvp-build'
pnpm --filter @comandinha/web build
Remove-Item Env:COMANDINHA_WEB_DIST_DIR
```

Expected: the production build passes without touching the active developer or Playwright output directories. Review route first-load sizes for the tables page and confirm the QR renderer is emitted as a separate async chunk.

- [ ] **Step 5: Review the final mobile screenshots and repository state**

Inspect the captured panel and QR screenshots at 320 and 360 px, check `git diff --check`, and confirm no `.env`, generated build output, test database records or screenshots are staged.

## Self-Review

- **Spec coverage:** local flow and seed constraints are verified in Task 5; mobile operation screens and accessible target sizes in Task 2; retry behavior in Task 3; startup performance in Task 4; legacy and API/PostgreSQL boundaries in Task 5.
- **Step clarity:** each implementation step names its file, assertion or command; behavior beyond the approved local demo is excluded.
- **Type consistency:** the lazy QR module continues to use the existing `TableQrDialog` props and the current `PanelTable` type.
- **Review Focus:** all five cases map to targeted tests in Tasks 1–5.
- **Proportion:** the plan adds only test isolation, mobile usability checks/fixes, write-error coverage and one route-level code split; it does not replace existing flows or add dependencies.
