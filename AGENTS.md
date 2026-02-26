# AGENTS.md

## Cursor Cloud specific instructions

### Overview

LMS Kernel is a modular, multi-tenant LMS monorepo (pnpm 9 + Turborepo). See `README.md` for architecture and `ARCHITECTURE.md` for design details.

**Workspace layout:** `apps/api` (NestJS/Fastify, port 4000), `apps/web` (Next.js 14, port 3000), `packages/{core,audit,compliance,iam}`, `modules/` (empty, for future LMS feature modules).

### Standard commands

All documented in root `package.json`: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.

### Gotchas and non-obvious notes

- **Build order matters:** Packages must build before apps. `turbo run build` handles this via `dependsOn: ["^build"]`, but if building manually, build `@lms/core` first, then `@lms/audit`, `@lms/compliance`, `@lms/iam`, then apps.
- **Helmet dependency:** The API imports `helmet` but requires `@fastify/helmet` (Fastify plugin, not Express middleware). The `package.json` aliases `helmet` to `@fastify/helmet@11.1.1` via pnpm.
- **`@fastify/static` required:** The API needs `@fastify/static@7` for Swagger UI serving; without it, the NestJS bootstrap hangs.
- **No test files yet:** The project is v0.1.0 — test infrastructure is configured (Vitest for packages, Jest for API, Playwright for web) but no test files exist.
- **Next.js build + Google Fonts:** The `next build` production build requires internet access to download the Inter font from Google Fonts. In restricted-egress environments, `next dev` works fine (fonts are fetched lazily and gracefully degrade).
- **Docker images may be blocked:** In restricted-egress environments, Docker Hub / Quay pulls fail. PostgreSQL 16 and Redis 7 can be installed natively via `apt-get install postgresql redis-server` as an alternative. Keycloak is not available without Docker in this environment.
- **PostgreSQL dev credentials:** user=`lms`, password=`lms_dev_password`, db=`lms_kernel`, shadow db=`lms_kernel_shadow` (from `.devcontainer/docker-compose.yml`).
- **NestJS API uses URI-based versioning:** All routes are prefixed with `/v1/` (e.g. `/v1/health`, `/v1/auth/me`).
- **`exactOptionalPropertyTypes`** is set in `tsconfig.base.json`; the audit package overrides it to `false` due to the `sanitizeMetadata` return type.

### Starting services

1. **PostgreSQL:** `sudo pg_ctlcluster 16 main start` (native) or via Docker Compose at `.devcontainer/docker-compose.yml`
2. **Redis:** `sudo service redis-server start` (native) or via Docker Compose
3. **API:** `cd apps/api && npx nest start --watch` (port 4000) — or `pnpm --filter=@lms/api run dev`
4. **Web:** `cd apps/web && npx next dev` (port 3000) — or `pnpm --filter=@lms/web run dev`
5. **All at once:** `pnpm dev` (uses Turborepo to start all `dev` scripts concurrently)
