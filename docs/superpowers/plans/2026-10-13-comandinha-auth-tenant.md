# Comandinha Authentication and Tenant Foundation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (recommended because these tasks share interfaces in the same worktree) or `superpowers:subagent-driven-development` only if that execution method is selected. Execute each checkbox task in order and use test-first steps.

**Goal:** Add a secure NestJS-backed administrative identity and session foundation, then expose it to the Next.js app through a same-origin session gateway without leaking bearer credentials to browser JavaScript.

**Architecture:** PostgreSQL owns users, restaurant memberships, and revocable opaque sessions. NestJS validates credentials, derives the active restaurant from an authenticated membership, and publishes its contract through OpenAPI. Next.js Route Handlers create, inspect, and revoke sessions, keep the opaque secret in an HttpOnly cookie, and verify request origin for mutations. A server-only gateway secret prevents browsers from calling the session-creation API directly. Public admin registration is not part of the new API.

**Spec:** `docs/superpowers/specs/2026-10-12-comandinha-modernization-design.md`, sections “Identidade, sessão e multi-tenancy” and “Limites e etapas de execução”.

## Scope and boundaries

- This is the next independent milestone after the completed monorepo foundation. It adds identity, membership, session persistence, API authentication, and the Next-to-Nest session gateway.
- It does not migrate the legacy product, category, table, order, call, or closeout flows. Those frontend services still depend on the legacy API; their cutover belongs in the following business-domain integration plan, so do not switch the current login UI to the new session during this milestone.
- Keep the work on the existing isolated branch `codex/comandinha-modernization` in `.worktrees/comandinha-modernization`. Do not change the source checkout or main branch.
- Implement the NestJS API independently. Treat legacy backend code as reference material only; do not copy implementation without a license.
- Do not inspect or migrate the SQLite database. Do not deploy, provision infrastructure, or commit real credentials.
- Local development may create one owner, restaurant, and membership through an explicit, idempotent seed command. It must require environment-provided credentials, a separate `ALLOW_LOCAL_DEMO_SEED=true` opt-in, and a loopback PostgreSQL URL; it refuses production mode.
- Keep the session cookie opaque and HttpOnly. Never return it in a browser-facing response, persist it in localStorage, or trust a client-supplied user, role, or restaurant identifier.
- Require a separate high-entropy `AUTH_GATEWAY_SECRET` on Nest session-management routes. Next Route Handlers send it server-side; browser requests cannot supply it. Compare it safely and fail closed when it is missing. This is a service credential, never a `NEXT_PUBLIC_*` variable.
- A valid session requires an active user, active membership, unexpired session, and no revocation timestamp. Password verification uses Node's supported `node:crypto` primitives with per-password random salt and constant-time comparison; new scrypt hashes use OWASP's `N=2^17, r=8, p=1` baseline while the fixed legacy format remains verifiable.
- Apply login throttling by account and trusted source in NestJS, plus aggregate source throttles in both NestJS and the Next BFF. Normalize IPv6 clients to `/64`, never trust browser-supplied forwarding headers, and document that the per-instance in-memory limits need shared/distributed storage before horizontal production scaling. The production Next gateway requires HTTPS for `API_INTERNAL_URL`. This milestone does not claim production readiness.
- Treat responsive behavior as a project-wide UI requirement for follow-up flow migrations: customer, QR, and table-service experiences are always mobile-first; admin may be desktop-first but must remain fully usable on mobile and tablet. This auth/API milestone does not redesign existing screens.

## Review focus

- A browser cannot create an administrative account through the new API; local owner creation is an explicit, production-blocked seed command.
- The API stores only a hash of a high-entropy random session secret. A leaked database row must not authenticate a request.
- Tenant and role in the authenticated principal come exclusively from the session's active membership. Forged `restaurantId`, `userId`, role, or tenant headers cannot override them.
- Logout and expiry immediately invalidate a session. Revocation is persisted, not simulated by deleting browser state alone.
- The Next gateway returns no raw session secret, sets `HttpOnly`, `SameSite=Lax`, a root cookie path, and `Secure` in production; mutating requests require the configured trusted origin. Login also enforces a trusted-source limit and fails closed in production if no trusted client identity is available.
- Direct browser requests to Nest session creation fail without the server-only gateway secret.
- Generated OpenAPI client types are current, and existing workspace tests, build, lint, and typecheck remain green.
- The legacy login and existing admin data flows remain available and unchanged during this milestone. Do not claim the web product has completed its API migration when only the new session gateway is integrated.
- Every later frontend migration follows the approved responsive strategy: client-facing flows start at mobile sizes; administrative screens may start at desktop sizes and must preserve core tasks on narrow screens.

## File map

- API persistence: `apps/api/prisma/schema.prisma`, migration `apps/api/prisma/migrations/20261013131444_admin_identity_and_sessions/migration.sql`, `apps/api/prisma/seed-config.ts`, `apps/api/prisma/seed-config.spec.ts`, `apps/api/prisma/seed-owner.ts`, `apps/api/prisma/seed.ts`, and `apps/api/package.json`.
- API foundation: new `apps/api/src/auth/**` (including `password-hasher.ts`), `apps/api/src/database/**` updates only as needed, `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, and `apps/api/src/openapi.ts`.
- API tests: unit tests under `apps/api/src/auth/**` and `apps/api/prisma/**`, plus PostgreSQL-backed `apps/api/test/auth-schema.integration-spec.ts` and `apps/api/test/auth.integration-spec.ts`.
- Contract: generated `apps/api/openapi.json`, `packages/api-client/src/generated/schema.d.ts`, and `packages/api-client/src/index.ts` only if a typed helper is needed.
- Next gateway: `apps/web/src/app/api/auth/login/route.ts`, `apps/web/src/app/api/auth/session/route.ts`, `apps/web/src/lib/server/auth-api.ts`, `apps/web/src/lib/server/auth-cookie.ts`, and `apps/web/src/lib/server/login-source-rate-limit.ts`.
- Web tests: route-handler tests under `apps/web/src/app/api/auth/**/__tests__/**` or the repository's existing Jest convention, plus focused cookie/origin tests.
- Configuration and docs: root `.env.example`, `README.md`, and `docs/adr/0002-admin-sessions-and-tenant-context.md`.

---

### Task 1: Add identity and tenant membership schema with a safe local bootstrap

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/package.json`
- Create: `apps/api/prisma/migrations/<timestamp>_admin_identity_and_sessions/migration.sql`, `apps/api/prisma/seed.ts`, and focused schema/seed tests where supported

**Interfaces:**
- `User`: normalized unique email, display name, password hash, active state, timestamps.
- `Membership`: user and restaurant relation, explicit role and active state, unique user/restaurant pair.
- `AdminSession`: unique token hash, user and membership association, expiry, revocation, creation and last-seen timestamps; indexes support token lookup and expiry cleanup.
- Local seed command reads `DEMO_OWNER_NAME`, `DEMO_OWNER_EMAIL`, `DEMO_OWNER_PASSWORD`, `DEMO_RESTAURANT_NAME`, and `DEMO_RESTAURANT_SLUG`; it avoids duplicate records, requires explicit local opt-in and a loopback database URL, and refuses `NODE_ENV=production`.

- [x] **Step 1: Write schema and seed acceptance tests**

Add tests for normalized email uniqueness, membership uniqueness, required session expiry, and production-mode seed refusal. Run the focused suite and confirm the new cases fail before implementation.

- [x] **Step 2: Implement Prisma models and migration**

Add User, Membership, and AdminSession relations and indexes. Generate the migration from the schema, inspect the SQL for destructive operations, regenerate Prisma Client, and keep the existing Restaurant data model intact.

- [x] **Step 3: Implement the local owner seed**

Hash the supplied password using a per-password random salt and Node `scrypt`; upsert the user, restaurant, and owner membership transactionally. Require all variables, reject weak/missing credentials, and make repeated runs safe. Never add a default password or seed HTTP endpoint.

- [x] **Step 4: Verify the persistence task**

Run Prisma validation/generation, focused seed tests, and the PostgreSQL integration setup against a fresh local database. Confirm the seed refuses production mode and produces no user-visible secret output.

### Task 2: Implement NestJS sessions, authentication guard, and tenant principal

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts` if needed, DTOs, password/session utilities, `auth.guard.ts`, and current-principal decorator
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/openapi.ts`, `apps/api/package.json`
- Create: focused auth unit tests and `apps/api/test/auth.integration-spec.ts`

**Interfaces:**
- `POST /auth/sessions` accepts email/password and an optional restaurant slug, then returns an opaque session secret plus expiry only to a caller with the server-only gateway secret; failures use one generic invalid-credentials response. A restaurant slug is accepted only after the credentials are verified and active membership is checked. If the user has multiple memberships and omits the slug, require an explicit selection rather than silently choosing a restaurant.
- `GET /auth/sessions/current` requires the opaque session secret and returns safe user, restaurant, role, and expiry metadata without returning password or token hashes.
- `DELETE /auth/sessions/current` requires the secret, persists revocation, and returns `204`.
- Protected handlers obtain a principal shaped as `{ userId, restaurantId, membershipId, role, sessionId }` through a guard/decorator. No handler reads tenant identity from request body or query parameters.
- Login throttling applies five attempts per normalized account per minute. The account key is hashed before storage, and the in-memory storage limitation is documented.

- [x] **Step 1: Write failing auth unit and integration tests**

Cover password hash/salt verification, generic invalid credentials, gateway-secret rejection, session-secret hashing, session expiry/revocation, inactive user/membership rejection, membership-derived tenant context, and forged tenant headers. The database integration cases run only against local PostgreSQL.

- [x] **Step 2: Implement password and session primitives**

Use `node:crypto` `scrypt`, `randomBytes`, `createHash`, and `timingSafeEqual`. Generate at least 256 bits of random session entropy, return the secret once to the caller, store only its SHA-256 hash, and enforce expiry/revocation on every validation.

- [x] **Step 3: Implement the Prisma-backed auth service and guard**

Normalize email, verify active membership, create a session tied to that membership, and derive the request principal from persisted records. Do not add public signup, tenant selection by arbitrary ID, refresh-token reuse, JWT signing, or credentials in logs.

- [x] **Step 4: Expose documented session routes and rate limiting**

Add DTO validation, appropriate 401/204 responses, OpenAPI cookie-gateway notes, and login throttling. Ensure errors do not reveal whether an email exists. Generate the OpenAPI document.

- [x] **Step 5: Run API verification**

Run focused unit tests, PostgreSQL integration tests, `pnpm --filter @comandinha/api lint`, `typecheck`, `build`, and the API test suite. Verify revoked and expired secrets return 401 and cross-tenant context cannot be forged.

### Task 3: Add the same-origin Next.js session gateway

**Files:**
- Create: `apps/web/src/app/api/auth/login/route.ts`, `apps/web/src/app/api/auth/session/route.ts`, `apps/web/src/lib/server/auth-api.ts`, `apps/web/src/lib/server/auth-cookie.ts`, and route tests
- Modify: `apps/web/package.json` only if a test utility is genuinely needed

**Interfaces:**
- `POST /api/auth/login` validates origin and request shape, applies a source-IP limit using only trusted infrastructure identity, calls the internal Nest API, and sets the opaque secret only as an HttpOnly cookie. Its JSON response contains safe identity metadata, never the secret.
- `GET /api/auth/session` reads the cookie server-side, validates it with Nest, and returns safe session metadata; it clears invalid/expired cookies.
- `DELETE /api/auth/session` validates origin, revokes the Nest session, clears the cookie, and returns `204`.
- Cookie name is a documented `__Host-`-compatible name in production, with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and max-age aligned to session expiry. Local HTTP development uses a non-`__Host-` fallback name without `Secure`.
- Internal Nest origin comes from server-only `API_INTERNAL_URL`; it is never exposed through `NEXT_PUBLIC_*` configuration, and must use HTTPS when `NODE_ENV=production`.

- [x] **Step 1: Write failing gateway route tests**

Mock only the internal Nest HTTP boundary. Assert login success/failure, secret not present in JSON, exact cookie flags, missing/invalid cookie handling, logout revocation, and rejection of absent or mismatched Origin on mutations.

- [x] **Step 2: Implement server-only Nest client and cookie helpers**

Build a small fetch wrapper using `API_INTERNAL_URL`, bounded request timeouts, safe error mapping, and no forwarding of arbitrary browser headers. Keep all cookie read/write code inside server-only modules and Route Handlers.

- [x] **Step 3: Implement login, current-session, and logout routes**

Set and clear the cookie with explicit options; return only safe session metadata. Validate Origin against configured `APP_ORIGIN` (set explicitly to localhost during development); do not infer a trusted origin from arbitrary forwarded host headers. Do not enable broad CORS or expose a raw-token endpoint to client code.

- [x] **Step 4: Verify the web gateway**

Run the route tests, web typecheck, lint, and production build. Inspect rendered metadata/build output to confirm the API secret never appears in client bundles or public environment configuration.

### Task 4: Regenerate contract, document local workflow, and review the change

**Files:**
- Modify: `.env.example`, `README.md`, `apps/api/openapi.json`, `packages/api-client/src/generated/schema.d.ts`
- Create: `docs/adr/0002-admin-sessions-and-tenant-context.md`

- [x] **Step 1: Generate and verify the OpenAPI client**

Run the repository's `pnpm api:client:generate` and `pnpm api:client:check`; ensure no manually duplicated frontend DTOs are introduced for session responses.

- [x] **Step 2: Document the local end-to-end setup**

Document required environment variables (`API_INTERNAL_URL`, `AUTH_GATEWAY_SECRET`, `APP_ORIGIN`, cookie mode, and local seed inputs), local PostgreSQL startup, migration, explicit dev seed, session endpoints, cookie behavior, current feature boundary, and cleanup. Keep `.env.example` placeholders non-secret.

- [x] **Step 3: Run final verification**

Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, the API integration suite, and focused Next Route Handler tests. If a command requires Docker/PostgreSQL, report unavailable infrastructure clearly rather than substituting a mock for the database isolation tests.

- [x] **Step 4: Inspect the final diff and request review**

Run `git diff --check`, inspect migration and generated-client diffs, and request a fresh code review focused on secret handling, tenant derivation, CSRF/origin checks, seed safety, and compatibility with the still-legacy UI. Do not deploy. On 2026-10-13, the user authorized single-responsibility commits and pushing the combined branch for pull requests against `develop` and `master`.

## Follow-up plan

After this foundation, write a separate reviewed plan for the first fully user-visible vertical slice: migrate login to the new same-origin session, connect categories and products to NestJS through the generated client, and refactor the related screens using the approved responsive strategy. Customer, QR, and table-service flows must be mobile-first; the admin may be desktop-first but must retain complete core workflows on mobile and tablet. Continue with tables, orders, kitchen calls, closeout, and their UI refactors in separate slices. Keep current legacy screens operational until their replacements are ready; avoid presenting the admin as fully migrated before then.
