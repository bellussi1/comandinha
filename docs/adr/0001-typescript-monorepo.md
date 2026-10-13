# ADR 0001: TypeScript monorepo foundation

- Status: accepted
- Date: 2026-10-13
- Scope: local foundation for the Comandinha web and API applications

## Context

The repository contains an existing Next.js customer/admin interface and a legacy backend in a separate repository. The backend has no declared license, so it is reference material only: this foundation must not copy its implementation or import its database. The first milestone needs a reproducible workspace and an independently developed API before product flows are rebuilt and connected.

## Decision

Keep the existing interface in `apps/web` and create a clean NestJS API in `apps/api`, managed by one pnpm workspace and Turborepo. Use Node.js 24.21.0, pnpm 12.11.2, Next.js 16.4.0, React 19.3.0, NestJS 12.1.3, TypeScript 6.0.3, and Tailwind CSS 4.3.3. UI components stay inside the web app; this foundation does not add a generic shared UI package.

Use PostgreSQL 18 with Prisma 7.10.0 and `@prisma/adapter-pg` for the API's initial relational schema. Docker Compose provides an isolated local PostgreSQL service with a named volume and health check. Liveness reports whether the API process responds; readiness checks PostgreSQL with a query. Both endpoints are infrastructure checks and do not represent product functionality.

Generate an OpenAPI document from Nest Swagger and derive a small typed fetch client for future web/API integration. CI checks generated-file drift, runs lint, type checks, tests, PostgreSQL-backed integration tests, the Playwright smoke test, and production builds. Runtime and package-manager versions are pinned in the repository.

## Consequences

- One lockfile and shared scripts make web/API setup and validation consistent.
- The API can evolve from a clean implementation without inheriting unlicensed legacy code or customer data.
- PostgreSQL and Prisma add Docker and database setup requirements to local development and CI.
- The generated client catches API contract changes before consumers drift.
- The initial API only establishes liveness, readiness, and the `Restaurant` schema. Authentication, restaurant isolation, menus, tables, orders, customer/admin API flows, deployment, and production operations remain future work.
- `pnpm dev` starts local PostgreSQL and both applications. No deployment, cloud provisioning, or production migration is part of this decision.

## Alternatives considered

- **Keep the legacy backend:** rejected because its license is undeclared and its persistence/data must remain untouched.
- **Use a single Next.js application for the API:** rejected to give the backend an independent NestJS boundary and preserve typed OpenAPI contracts.
- **Use SQLite or an in-memory database:** rejected because the initial backend needs a relational database workflow that also runs in CI; PostgreSQL provides the same engine locally and in integration tests.
- **Create a shared UI package now:** rejected because current UI components are app-specific and no second consumer exists.
