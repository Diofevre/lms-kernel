# LMS Kernel

> Modular, multi-tenant Learning Management System — institutional grade.

**Stack**: NestJS + Next.js + Keycloak + PostgreSQL + Prisma
**Compliance**: Loi 25 (Québec) | WCAG 2.1 AA | LPRPDE
**Hosting**: AWS `ca-central-1` (data residency — Canada)

---

## Development

All development happens in **GitHub Codespaces** — nothing runs locally.

1. Open this repo on GitHub
2. Click **Code → Codespaces → New codespace**
3. All services start automatically (PostgreSQL, Redis, Keycloak)
4. Get secrets from Bitwarden Secrets Manager: `bws secret get <ID>`

## Repository structure

```
apps/
  api/          NestJS backend API
  web/          Next.js frontend (WCAG 2.1 AA)
packages/
  core/         Module system, event bus
  audit/        Immutable audit log (hash chain)
  compliance/   Loi 25 + WCAG CI gates
  iam/          Keycloak adapter types
modules/        Pluggable LMS modules (courses, proctoring, BBB...)
agents/
  context/      Architecture docs for AI agents
  missions/     Task files for Cursor / Claude Code agents
.github/
  workflows/    7-stage CI/CD pipeline
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — architecture overview
- [MODULE_CONTRACT.md](./MODULE_CONTRACT.md) — how to create a module
- [agents/context/AGENT_ONBOARDING.md](./agents/context/AGENT_ONBOARDING.md) — for AI agents

## CI/CD Pipeline

7 stages: Pre-commit → PR Gate → Integration → Security Deep Scan → Staging → Pre-prod Approval → Production Canary

See `.github/workflows/` for details.

## Compliance

- **Loi 25**: Consent management, data subject rights, ÉFVP, breach notification (72h)
- **WCAG 2.1 AA**: Axe-core + Pa11y in CI, Shadcn/Radix accessible components
- **Immutable audit**: SHA-256 hash chain, append-only
- **Secrets**: Bitwarden SM (dev) + AWS Secrets Manager (prod)
