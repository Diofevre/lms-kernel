# Sprint 01 — Foundation

**Période** : 2026-02-26 → TBD
**Objectif** : Mettre en place les fondations du kernel (DB, Auth, CI)

## Tâches

| Tâche | Mission | Agent | PR | Statut |
|---|---|---|---|---|
| Schéma Prisma + RLS | [Mission 01](../../agents/missions/01-setup-database.md) | Cursor Cloud | — | ⏳ À faire |
| Keycloak auth complet | [Mission 02](../../agents/missions/02-implement-auth.md) | Cursor Cloud | — | ⏳ Bloquée (dépend M01) |
| pnpm-lock.yaml | — | — | — | ⏳ À faire |

## Décisions prises ce sprint

- [ADR 0001](../../docs/adr/0001-nestjs-nextjs-monorepo.md) — Stack NestJS + Next.js
- [ADR 0003](../../docs/adr/0003-postgresql-prisma-rls.md) — PostgreSQL + Prisma + RLS

## Blocages rencontrés

- Agent Cursor Cloud sans accès `registry.npmjs.org` → tentative de bundler node_modules dans git (résolu : ajouter domaine à allowlist)

## Métriques fin de sprint

- PRs mergées : 5
- Tests écrits : 0 (fondations posées, tests Sprint 02)
- Couverture : N/A
- Violations Loi 25 détectées par CI : 0
- Violations WCAG détectées : 0
