# Agent Onboarding — LMS Kernel

> **READ THIS ENTIRE FILE before writing a single line of code.**

## What is this project?

LMS Kernel is a **multi-tenant, modular Learning Management System** built with:
- **NestJS** (API backend — `apps/api/`)
- **Next.js + Shadcn/UI** (frontend — `apps/web/`)
- **Keycloak** (IAM — external service)
- **PostgreSQL + Prisma** (database)

## Critical rules — NEVER violate these

1. **NEVER push to `main`, `staging`, or `develop` directly** — always create a PR from `feature/your-task`
2. **NEVER hardcode secrets** — use `process.env["VAR_NAME"]` — never actual values
3. **NEVER use non-Canadian AWS regions** — only `ca-central-1` (Loi 25)
4. **NEVER skip tests** — every new function needs a unit test
5. **NEVER delete database records** — use soft-delete (`deletedAt`)
6. **NEVER return `any` in TypeScript** — always typed
7. **ALWAYS label your PR as `ai-generated`**
8. **ALWAYS run before PR**: `pnpm typecheck && pnpm lint && pnpm test`

## Key files to read before starting

1. [ARCHITECTURE.md](../../ARCHITECTURE.md) — overall architecture
2. [MODULE_CONTRACT.md](../../MODULE_CONTRACT.md) — how to create a module
3. [packages/core/src/types.ts](../../packages/core/src/types.ts) — KernelModule interface
4. [packages/compliance/src/loi25-types.ts](../../packages/compliance/src/loi25-types.ts) — Loi 25 types

## Workflow for every task

```
1. git checkout -b feature/your-task-name
2. Read the mission file in agents/missions/
3. Read relevant existing code BEFORE writing new code
4. Write code + tests
5. pnpm typecheck && pnpm lint && pnpm test
6. git commit -S -m "feat: your task description"
7. gh pr create --title "feat: your task" --label ai-generated
```

## Environment setup (Codespaces)

The devcontainer auto-installs everything. Services available:
- PostgreSQL: `localhost:5432` (user: lms, pass: lms_dev_password, db: lms_kernel)
- Redis: `localhost:6379`
- Keycloak: `localhost:8080` (admin/admin_dev_only)
- API: `localhost:4000`
- Web: `localhost:3000`

Copy `.env.example` to `.env` and fill in dev values (get from Bitwarden SM):
```bash
bws secret get <SECRET_ID>
```

## Compliance gates (will block your PR if violated)

- **Loi 25**: PII fields without `@RetentionPolicy`, non-Canadian region references
- **WCAG AA**: Components not using Radix/Shadcn, missing aria labels
- **Tests**: Coverage below 80%
- **Secrets**: Any hardcoded credentials (Gitleaks)
- **TypeScript**: `any` types, strict mode violations
