# LMS Kernel — Architecture

> **READ THIS FIRST** — agents and developers must read this document before touching any code.

## Overview

LMS Kernel is a **multi-tenant, modular platform** built on NestJS (API) + Next.js (Web).
It is designed to power multiple applications — LMS, and future platforms — through a plugin-based module system.

## Stack

| Layer | Technology | Location |
|---|---|---|
| Backend API | NestJS 10 + Fastify | `apps/api/` |
| Frontend Web | Next.js 14 App Router | `apps/web/` |
| Auth / IAM | Keycloak 24 (OIDC/SAML) | External service |
| Database | PostgreSQL 16 + Prisma | `packages/db/` |
| Job queue | BullMQ + Redis 7 | Via Docker |
| Module system | `@lms/core` | `packages/core/` |
| Audit log | `@lms/audit` (hash chain) | `packages/audit/` |
| Compliance | `@lms/compliance` (Loi 25 + WCAG) | `packages/compliance/` |
| IAM types | `@lms/iam` | `packages/iam/` |

## Multi-tenant Architecture

Every request is scoped to a **tenant** resolved from the subdomain:

```
org1.lms.example.com → tenantSlug = "org1"
org2.lms.example.com → tenantSlug = "org2"
```

- `TenantMiddleware` (API) and `middleware.ts` (Web) resolve the tenant on every request
- All database queries include `WHERE tenant_id = $tenantId`
- PostgreSQL Row Level Security (RLS) enforces isolation at DB level
- Keycloak: each tenant has its own realm OR tenant_id claim in shared realm

## Module System

See [MODULE_CONTRACT.md](./MODULE_CONTRACT.md) for full details.

Every feature is a `KernelModule`:
1. Declares its `id`, `version`, `dependencies`
2. Implements `onInit()`, `onReady()`, `onDestroy()`
3. Gets a `KernelContext` with logger, event bus, other modules

```typescript
import type { KernelModule, KernelContext } from "@lms/core";

export const coursesVideoModule: KernelModule = {
  id: "courses-video",
  name: "Courses — Video",
  version: "0.1.0",
  dependencies: ["auth"],
  async onInit(ctx) {
    ctx.logger.info("Courses Video module initialized");
  },
};
```

## Request Flow (API)

```
Client Request
  → TenantMiddleware     (resolve tenant from subdomain)
  → ThrottlerGuard       (rate limiting: 10/s, 200/min, 1000/h)
  → AuthGuard            (Keycloak JWT validation)
  → AuditInterceptor     (log mutating operations)
  → Controller           (business logic)
  → HttpExceptionFilter  (never leak stack traces)
```

## Security Model

1. **Authentication**: Keycloak OIDC — Bearer JWT on every API request
2. **Authorization**: Role-based (`KernelRole`) via `@Roles()` decorator
3. **Rate limiting**: ThrottlerGuard globally (NestJS)
4. **Input validation**: `class-validator` DTOs — strips unknown fields
5. **Error responses**: Never leak stack traces (HttpExceptionFilter)
6. **Audit log**: Every mutating operation logged (AuditInterceptor)
7. **Secrets**: Bitwarden SM (dev) + AWS Secrets Manager (prod) — never in `.env`
8. **Data residency**: AWS `ca-central-1` only (Loi 25)

## Compliance

| Standard | Implementation |
|---|---|
| Loi 25 (Québec) | `@lms/compliance` — consent, data subject rights, ÉFVP, breach notification |
| WCAG 2.1 AA | Shadcn/UI + Radix + axe-core CI gate |
| LPRPDE (federal) | Covered by Loi 25 implementation |
| Immutable audit | SHA-256 hash chain in `@lms/audit` |

## CI/CD Pipeline (7 stages)

| Stage | Trigger | Key checks |
|---|---|---|
| 0 — Pre-commit | Every push | Gitleaks, GPG signature, conventional commits |
| 1 — PR Gate | PR → develop | Lint, typecheck, tests 80%, WCAG, Loi 25 gate |
| 2 — Integration | Merge → develop | E2E, SAST, SBOM, mutation testing |
| 3 — Security Deep Scan | Nightly | SonarCloud, DAST OWASP ZAP, Checkov, Snyk |
| 4 — Staging | Push → staging | Load tests (k6), WCAG full audit, 72h quarantine |
| 5 — Pre-prod Approval | Manual trigger | Multi sign-off, institutional PDF dossier |
| 6 — Production | GitHub Release | Canary 5%→25%→100%, auto-rollback, Slack |

## Branching Strategy

```
feature/* → develop → staging → main (production)
```

- `main` : protected, requires 2 approvals + all CI + manual sign-off
- `staging` : auto-deployed, 72h quarantine minimum
- `develop` : integration branch, CI required
- `feature/*` : agent/dev branches, PR to develop

## Agent Rules

1. **Never push directly to `main`, `staging`, or `develop`** — always PR
2. **Always run `pnpm typecheck` and `pnpm lint` before creating PR**
3. **Secrets go in Bitwarden SM** — never hardcode, never `.env` with real values
4. **Label PRs with `ai-generated`** if the code was written by an agent
5. **Read MODULE_CONTRACT.md** before creating a new module
6. **Data residency**: never reference non-Canadian AWS regions
