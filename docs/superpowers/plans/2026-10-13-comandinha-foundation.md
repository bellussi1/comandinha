# Comandinha Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (recommended because these tasks share one workspace and build on prior interfaces) or `superpowers:subagent-driven-development` if that execution method is selected. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Next.js repository into a working local pnpm/Turborepo monorepo with the web app under `apps/web`, a NestJS API under `apps/api`, PostgreSQL, generated OpenAPI client types, and CI.

**Architecture:** Preserve the existing customer and admin flows while moving the Next app into the workspace and upgrading its framework and UI foundation. Add a modular NestJS API with liveness/readiness endpoints and Prisma-backed PostgreSQL connectivity; keep business rules, authentication, tenant isolation, and order flows for later plans.

**Tech Stack:** Node.js 24.21.0 LTS, pnpm 12.11.2, Turborepo 2.11.7, Next.js 16.4.0, React 19.3.0, NestJS 12.1.3, TypeScript 6.0.3, Prisma 7.10.0, PostgreSQL 18, Tailwind CSS 4.3.3, shadcn CLI 4.21.4 with Base UI 1.9.0, Vitest 5.0.4, Playwright 1.64.0, and Motion 14.1.0 only if a scoped interaction needs it.

**Spec:** `docs/superpowers/specs/2026-10-12-comandinha-modernization-design.md`

## Global Constraints

- Work from an isolated feature worktree starting at commit `60eb6c1` (the approved `codex/comandinha-modernization-spec` snapshot), then create a dedicated implementation branch there; do not modify the source repository's main branch.
- Implement the new NestJS API independently; the legacy backend has no declared license and is reference material only.
- Do not inspect, import, or migrate data from the versioned SQLite database.
- Do not deploy, publish, provision cloud resources, run Terraform/OpenTofu apply, or add real secrets.
- Use Node.js 24 LTS, with Node >=24.15 for Nest CLI schematics; the audited machine has Node 24.13.0 and must be upgraded before scaffolding.
- Use Next.js 16.4.0, React/React DOM 19.3.0, NestJS 12.1.3, Nest CLI 12.0.8, Nest Swagger 12.0.2, TypeScript 6.0.3, Prisma and PostgreSQL adapter 7.10.0, PostgreSQL 18, pnpm 12.11.2, and Turborepo 2.11.7 as the 12/10/2026 snapshot; revalidate stable security-supported versions before installation.
- Use Tailwind CSS 4.3.3, shadcn CLI 4.21.4, Base UI 1.9.0, Lucide React 1.55.0, React Hook Form 7.90.0, Zod 4.6.7, resolver 5.9.1, and Sonner 2.0.8 only for their documented UI roles. Add Motion 14.1.0 only if a scoped interaction needs it; respect reduced motion.
- Pin one pnpm lockfile at the monorepo root. Keep UI components in `apps/web`; do not create a generic shared package.
- Keep the MVP scope to a local, reproducible foundation. Do not claim production readiness, scale, or performance gains.

## Review Focus

- The dev orchestrator must resolve the repository root from its own script path; verify `pnpm --dir <repo-root> dev` behaves the same when invoked from the repository root and from `apps/web`.
- The API liveness check must succeed while PostgreSQL is down, while readiness must fail until PostgreSQL accepts queries; pin each behavior in API tests.
- `pnpm dev` must not launch Next or Nest until PostgreSQL is healthy; verify startup ordering when the database health check is delayed.
- A Next production build must work with the monorepo root and Turbopack after removing the duplicate webpack configuration; pin this with the production build and a Playwright home-page smoke test.
- Changes to Nest OpenAPI must make CI fail when generated client types are stale; pin this with the generated-client check.

## File Map

- Root workspace files: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `.npmrc`, `.node-version`, `.gitignore`, `compose.yaml`, and `.env.example`.
- Existing frontend moves intact into `apps/web/`: `src/**`, `public/**`, `components.json`, `.eslintrc.json`, `jest.config.ts`, `jest.setup.ts`, `jsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.js` during migration, `tsconfig.json`, and the app's `package.json`.
- Frontend modernization files: `apps/web/package.json`, `apps/web/next.config.mjs`, `apps/web/postcss.config.mjs`, `apps/web/src/app/globals.css`, `apps/web/components.json`, `apps/web/eslint.config.mjs`, `apps/web/jest.config.ts`, and the Next-generated `apps/web/AGENTS.md`; remove the obsolete `apps/web/next.config.js`, `apps/web/tailwind.config.js`, and `apps/web/.eslintrc.json` after their needed settings are migrated.
- API files: `apps/api/package.json`, `apps/api/nest-cli.json`, `apps/api/tsconfig.json`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/health/health.module.ts`, `apps/api/src/health/health.controller.ts`, `apps/api/src/health/health.service.ts`, `apps/api/src/database/prisma.service.ts`, and API tests under `apps/api/test/`.
- Persistence and local services: `apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/**`, and `compose.yaml`.
- Contract tooling: `apps/api/scripts/export-openapi.ts`, `apps/api/openapi.json`, `packages/api-client/package.json`, `packages/api-client/src/generated/schema.d.ts`, `packages/api-client/src/index.ts`, `scripts/check-api-client.mjs`, and `scripts/check-api-client.test.mjs`.
- Automation and docs: `.github/workflows/ci.yml`, root `README.md`, and `docs/adr/0001-typescript-monorepo.md`.

---

### Task 1: Bootstrap the pnpm workspace and relocate the existing web app

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.node-version`
- Move: root Next app files and directories to `apps/web/` as listed in the File Map, including `.eslintrc.json`, `jsconfig.json`, and `jest.setup.ts`
- Modify: `.gitignore`, `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/jest.config.ts`
- Remove: root `package-lock.json` after the pnpm lockfile is generated

**Interfaces:**
- Produces: workspace package `@comandinha/web`; root commands `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck`. Initially, `pnpm dev` runs the workspace dev tasks; Task 4 wraps it with PostgreSQL startup.
- Produces: root commands `pnpm infra:down`, `pnpm test:integration`, `pnpm api:client:generate`, and `pnpm api:client:check` as their owning tasks are completed.
- Root package pins `packageManager` to `pnpm@12.11.2` and engines to `node >=24.15.0`.
- Turborepo tasks use `dev` as persistent, `build` depending on upstream builds, and cache outputs for `.next/**` and `dist/**`. Add `coverage/**` only when a workspace test task produces coverage artifacts.

- [x] **Step 1: Capture the existing frontend baseline in the worktree**

Run `npm ci`, `npm test -- --ci`, and `npm run build` from the existing repository root. Record any baseline failures before moving files; do not repair unrelated behavior in this task.

- [x] **Step 2: Create root workspace configuration and move the web package**

Move the existing Next source, assets, and app configuration under `apps/web/`. Keep `.claude/` and project-level Git files at the root. Rename the web package to `@comandinha/web`, add the pinned root package manager/runtime metadata, and define Turborepo tasks. In this task, root `pnpm dev` runs `turbo run dev --parallel`.

- [x] **Step 3: Generate and inspect the pnpm lockfile**

Run `pnpm install` with Node 24.21.0 and pnpm 12.11.2. Remove the npm lockfile only after `pnpm-lock.yaml` contains the `@comandinha/web` importer.

- [x] **Step 4: Verify workspace commands and moved frontend tests**

Run `pnpm --filter @comandinha/web test --ci`, `pnpm --filter @comandinha/web typecheck`, and `pnpm --filter @comandinha/web build` from the repository root. Expected: existing test behavior is preserved and Next resolves all source aliases from `apps/web`.

- [x] **Step 5: Commit the workspace relocation**

Commit as `build: bootstrap pnpm monorepo workspace`.

### Task 2: Upgrade the web runtime and UI foundation

**Files:**
- Modify: `apps/web/package.json`, `apps/web/next.config.mjs`, `apps/web/postcss.config.mjs`, `apps/web/src/app/globals.css`, `apps/web/components.json`, `apps/web/jest.config.ts`, and root `.gitignore`
- Remove: `apps/web/next.config.js`, `apps/web/tailwind.config.js`, `apps/web/.eslintrc.json`, and the `tailwindcss-animate` dependency after CSS animation migration
- Create: `apps/web/AGENTS.md` (generated by Next.js 16), `apps/web/eslint.config.mjs`, `apps/web/e2e/foundation.spec.ts`, and `apps/web/playwright.config.ts`

**Interfaces:**
- Consumes: `@comandinha/web` workspace and root scripts from Task 1.
- Produces: Next.js 16/React 19.3 app using Tailwind 4; shadcn adds Base UI-based components while existing Radix components remain operational until later flow-by-flow migration.
- Existing customer/admin routes and UI behavior remain available; this task changes framework and styling infrastructure, not product flows.

- [x] **Step 1: Configure browser smoke testing**

Add `@playwright/test` 1.64.0 and create `playwright.config.ts` plus `foundation.spec.ts`. The test starts the web app, navigates to `/`, expects HTTP success, and verifies the existing home-page heading is visible. Install Chromium locally and run this smoke test after the framework migration.

- [x] **Step 2: Upgrade framework and UI dependencies**

Pin Next 16.4.0 and matching `eslint-config-next`, React/React DOM and types 19.3.0, Tailwind CSS and `@tailwindcss/postcss` 4.3.3, shadcn CLI 4.21.4 with Base UI 1.9.0 (`base-nova` for future generated components), Lucide React 1.55.0, React Hook Form 7.90.0, Zod 4.6.7, `@hookform/resolvers` 5.9.1, Sonner 2.0.8, and Tailwind Merge 3.7.0. Upgrade ESLint to 10.12.0 with its flat config. Keep existing Radix primitives required by current components; do not migrate every component in this task. Replace `tailwindcss-animate` with `tw-animate-css` 1.4.0 to preserve existing animation utilities. Add Motion 14.1.0 only if a scoped interaction uses it.

- [x] **Step 3: Migrate Tailwind and Next configuration**

Run the official Tailwind v3-to-v4 upgrade tool against `apps/web`, inspect its diff, then move theme tokens and required animation utilities into the CSS-first Tailwind 4 setup. Configure `@tailwindcss/postcss`, update `components.json` to Base UI, preserve valid image configuration, `poweredByHeader: false`, and applicable existing runtime settings, consolidate the duplicate Next configs into `next.config.mjs`, and remove manual webpack chunk splitting so Turbopack is used by default. Keep `Cache Components` disabled until a later task proves its cache behavior.

- [x] **Step 4: Update scripts and browser test configuration**

Replace `next lint` with direct ESLint, remove obsolete `autoprefixer` if Tailwind 4's PostCSS pipeline makes it redundant, preserve the existing Jest suite for the web app, add `@playwright/test` 1.64.0, and configure the web app's local server command.

- [x] **Step 5: Verify framework migration**

Run `pnpm --filter @comandinha/web test --ci`, `pnpm --filter @comandinha/web typecheck`, `pnpm --filter @comandinha/web lint`, `pnpm --filter @comandinha/web build`, and `pnpm --filter @comandinha/web exec playwright test e2e/foundation.spec.ts`. Expected: all existing unit tests pass, production build uses Turbopack, and the public entry point returns HTTP 200.

- [x] **Step 6: Commit the web foundation**

Commit as `feat(web): upgrade Next and UI foundation`.

### Task 3: Add the NestJS API shell and liveness endpoint

**Files:**
- Create: `apps/api/package.json`, `apps/api/nest-cli.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/health/health.module.ts`, `apps/api/src/health/health.controller.ts`, `apps/api/src/health/health.service.ts`
- Create: `apps/api/test/health.e2e-spec.ts` and Vitest configuration
- Modify: root `turbo.json`, root `package.json`

**Interfaces:**
- Consumes: root workspace and Node runtime from Task 1.
- Produces: `GET /health/live` returns HTTP 200 with `{ "status": "ok" }` without querying PostgreSQL; the API listens on port 3001 by default.
- Produces: OpenAPI document metadata named `Comandinha API`, version `1.0.0`, with `/health/live` documented.

- [x] **Step 1: Scaffold the minimum NestJS application and test harness**

Use Nest CLI 12.0.8 on Node 24.21.0 to create the API package manifest, Nest CLI and strict TypeScript configuration, ESM bootstrap module, API scripts, and Vitest E2E setup. Add `@nestjs/testing` 12.1.3 and use Node's built-in `fetch` for HTTP assertions. Do not add the health route yet. Verify the app typechecks and builds.

- [x] **Step 2: Write the failing liveness endpoint test**

Create an E2E test that calls `GET /health/live` and asserts status 200 and the exact JSON body. Run `pnpm --filter @comandinha/api test:e2e`; expected: FAIL because the route does not exist.

- [x] **Step 3: Implement the liveness module and route**

Add `HealthService.live(): { status: "ok" }` and `HealthController` at `/health/live`. Register the module and ensure the handler does not inject or query the database.

- [x] **Step 4: Publish OpenAPI metadata and rerun tests**

Configure `@nestjs/swagger` 12.0.2 and verify the generated document includes the liveness response. Run API unit tests, E2E tests, typecheck, and build; expected: pass.

- [x] **Step 5: Commit the API shell**

Commit as `feat(api): bootstrap NestJS health endpoint`.

### Task 4: Add Prisma/PostgreSQL readiness and local Compose

**Files:**
- Create: `apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma`, first migration under `apps/api/prisma/migrations/`
- Create: `apps/api/src/database/prisma.service.ts`, `apps/api/src/database/database.module.ts`
- Modify: health service/controller/module and `apps/api/test/health.e2e-spec.ts`
- Create: root `compose.yaml`, `.env.example`, and `scripts/dev.mjs`

**Interfaces:**
- Consumes: liveness endpoint and API app from Task 3.
- Produces: `GET /health/ready` returns HTTP 200 with `{ "status": "ready" }` after a PostgreSQL `SELECT 1`; it returns HTTP 503 with `{ "status": "not-ready" }` when the database query fails.
- Produces: Prisma 7.10.0 uses `@prisma/adapter-pg` 7.10.0 and PostgreSQL 18. The initial schema has a `Restaurant` model with UUID id, name, unique slug, createdAt, and updatedAt; no legacy rows are imported.
- Produces: `pnpm dev` starts PostgreSQL through Compose, waits for its healthy state, then starts web and API; Ctrl+C stops app processes. `pnpm infra:down` stops local services.
- Modifies: root `pnpm dev` from Task 1 to run `node --env-file-if-exists=.env scripts/dev.mjs`, which passes root environment values to both app processes.

- [x] **Step 1: Write readiness tests for healthy and unavailable PostgreSQL**

Add API tests asserting ready returns 200 when `SELECT 1` succeeds and 503 when the database provider rejects. Run them before implementation; expected: FAIL because readiness and Prisma are not registered.

- [x] **Step 2: Configure Prisma 7 and the initial Restaurant migration**

Add Prisma 7.10.0, `@prisma/client` 7.10.0, `@prisma/adapter-pg` 7.10.0, and `pg`. Define the `Restaurant` model in `schema.prisma`, configure `prisma.config.ts`, generate the client, and create a reviewed initial migration.

- [x] **Step 3: Implement Prisma lifecycle and readiness query**

Create a Nest provider that constructs Prisma Client with the PostgreSQL adapter, connects/disconnects with application lifecycle hooks, and exposes `checkConnection(): Promise<boolean>`. Make `/health/ready` use this provider and return the specified JSON/status codes.

- [x] **Step 4: Add PostgreSQL 18 Compose health check**

Create a local PostgreSQL service with a named volume, a `pg_isready` health check, and credentials loaded from ignored `.env`; `.env.example` contains placeholders only. Do not add a tracked database file or import production data.

- [x] **Step 5: Add a root local-development command and startup-order test**

Create `scripts/dev.mjs` to resolve the repository root from `import.meta.url`, start `docker compose up -d --wait postgres` with that root as the child working directory, then launch `turbo run dev` with the same working directory. Handle termination signals by stopping child processes. Root `pnpm dev` calls this script; the API process does not start until PostgreSQL reports healthy. Add a Node test around the extracted orchestration function with a delayed fake Compose child and assert Turbo is not spawned before Compose exits successfully; assert a failed health wait never starts Turbo.

- [x] **Step 6: Verify migrations, readiness, and Compose**

Run `docker compose config`, `docker compose up -d postgres`, `pnpm --filter @comandinha/api prisma migrate deploy`, API readiness E2E tests, and the complete `pnpm dev` startup. Expected: a blank database receives the initial migration, readiness reports 200 only when PostgreSQL is available, and liveness still works if PostgreSQL is stopped.

- [x] **Step 7: Commit local database foundation**

Commit as `feat(api): add PostgreSQL readiness and local database`.

### Task 5: Generate the TypeScript API client and add CI

**Files:**
- Create: `apps/api/scripts/export-openapi.ts`, `apps/api/openapi.json`
- Create: `packages/api-client/package.json`, `packages/api-client/src/generated/schema.d.ts`, `packages/api-client/src/index.ts`
- Create: `scripts/check-api-client.mjs`, `scripts/check-api-client.test.mjs`, `.github/workflows/ci.yml`
- Modify: root scripts and `turbo.json`

**Interfaces:**
- Consumes: Nest OpenAPI metadata from Task 3 and workspace from Task 1.
- Produces: generated `paths` type containing `/health/live` and `/health/ready`; API consumers import it from `@comandinha/api-client`.
- Produces: `pnpm api:client:generate` writes generated types and `pnpm api:client:check` exits nonzero when regeneration changes tracked output.

- [ ] **Step 1: Define and test the generated-file comparison**

Create `scripts/check-api-client.test.mjs` with Node's built-in test runner and temporary files. Test that identical generated and checked-in output passes, while a stale checked-in file fails. Run it before implementing the comparison helper and confirm the stale-file assertion fails.

- [ ] **Step 2: Export the Nest OpenAPI document deterministically**

Create an export script using the Nest app module and SwaggerModule, write `apps/api/openapi.json`, and close the app after generation. The output must include liveness and readiness endpoints.

- [ ] **Step 3: Generate and expose API client types**

Use `openapi-typescript` 7.13.0 to create `packages/api-client/src/generated/schema.d.ts`. Expose a small `createApiClient(baseUrl: string)` wrapper using `openapi-fetch` 0.17.0; keep authentication and business logic out of the package.

- [ ] **Step 4: Make stale generated output fail CI**

Implement `api:client:check` by generating to a temporary file and comparing with the committed type file through the tested helper. Add CI jobs for frozen pnpm install, Node.js 24.21.0, pnpm 12.11.2, lint, typecheck, unit tests, PostgreSQL integration tests, client drift check, builds, and the Playwright smoke test; do not add deployment jobs or secrets. PostgreSQL CI credentials must be disposable test-only values.

- [ ] **Step 5: Run all repository checks**

Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm api:client:check`, `pnpm build`, and the Playwright smoke test. Expected: all pass on Node 24.21.0 with PostgreSQL 18.

- [ ] **Step 6: Commit generated client and CI**

Commit as `ci: validate monorepo contracts and builds`.

### Task 6: Document the local foundation and architecture decision

**Files:**
- Modify: root `README.md`
- Create: `docs/adr/0001-typescript-monorepo.md`
- Create: `.env.example` if not already added in Task 4

**Interfaces:**
- Consumes: workspace scripts, services, health endpoints, and UI/API stack from prior tasks.
- Produces: documented local setup on Node 24.21.0, pnpm 12.11.2, and Docker; setup uses example configuration only and clearly labels health endpoints as infrastructure checks, not product functionality.

- [ ] **Step 1: Write README verification checklist**

Add a documentation check for required sections: project status, stack/version snapshot, prerequisites, one-command startup, web/API URLs, test commands, environment variables, and known unimplemented product flows.

- [ ] **Step 2: Document setup and architecture trade-offs**

Update README and ADR with the selected Next.js/NestJS monorepo, clean-room backend constraint, Prisma 7 and PostgreSQL choice, generated OpenAPI client, local Compose workflow, and explicit no-deploy status.

- [ ] **Step 3: Verify commands and links from a clean checkout**

Follow the README in the worktree with a fresh `.env` copied from `.env.example`; run the documented startup and test commands. Expected: documented commands match actual root scripts and no real secret is required.

- [ ] **Step 4: Commit foundation documentation**

Commit as `docs: document Comandinha monorepo foundation`.

## Follow-up Plans

This foundation is the first milestone only. Write separate plans before implementing each connected but independently reviewable subsystem: authentication and restaurant isolation; menu/table/order domains and migration of customer/admin flows; final UI/accessibility refinement; infrastructure as code and deployment preparation (without provisioning).
