# Sprint 01 — Foundation Backlog
# SOURCE DE VÉRITÉ POUR AGENTS CURSOR CLOUD
#
# Jira : https://diofevre.atlassian.net/jira/software/projects/LMSK/boards
# Sprint : Sprint 01 — Foundation (2026-02-26 → 2026-03-12)
# Goal   : Prisma schema + RLS + Keycloak Auth + CI opérationnel
#
# ⚠️  AGENTS : Lisez ce fichier EN PREMIER avant toute mission.
#     Il contient l'état actuel, les dépendances, et l'ordre d'exécution.
# =============================================================================

## État actuel du sprint

| Ticket   | Titre                                | Statut      | Bloqué par     | Mission fichier                          |
|----------|--------------------------------------|-------------|----------------|------------------------------------------|
| LMSK-13  | pnpm-lock.yaml                       | À FAIRE     | —              | (humain — à faire dans Codespace)        |
| LMSK-9   | Schéma Prisma                        | À FAIRE     | LMSK-13        | agents/missions/01-setup-database.md     |
| LMSK-10  | Migrations RLS                       | À FAIRE     | LMSK-9         | agents/missions/01-setup-database.md     |
| LMSK-11  | AuthGuard Keycloak                   | À FAIRE     | LMSK-9, LMSK-10 | agents/missions/02-implement-auth.md   |
| LMSK-12  | Middleware tenant                    | À FAIRE     | LMSK-9         | agents/missions/02-implement-auth.md    |

## Ordre d'exécution obligatoire

```
ÉTAPE 0 (humain) : pnpm install → génère pnpm-lock.yaml → commit sur develop
       ↓
ÉTAPE 1 (agent)  : Mission 01 — Prisma schema + RLS
                   Branch : feature/01-database-schema
                   Tickets : LMSK-9, LMSK-10 + sous-tâches LMSK-14 à LMSK-23
       ↓ (PR mergée, CI vert)
ÉTAPE 2 (agent)  : Mission 02 — AuthGuard + Middleware
                   Branch : feature/02-auth-middleware
                   Tickets : LMSK-11, LMSK-12 + sous-tâches LMSK-24 à LMSK-31
```

## Règles absolues pour TOUS les agents ce sprint

### ✅ Tu DOIS faire
- Lire `agents/context/CODING_STANDARDS.md` avant d'écrire la première ligne
- Créer ta branche depuis `develop` (pas depuis main, pas depuis staging)
- Préfixer chaque commit : `feat(scope):`, `fix(scope):`, `test(scope):`
- Mentionner le ticket Jira dans chaque commit : `feat(db): add Tenant model [LMSK-9]`
- Ajouter `tenantId` sur TOUTES les tables liées à un tenant
- Écrire les tests AVANT ou EN MÊME TEMPS que le code (pas après)
- Mettre à jour `CHANGELOG.md` section `[Unreleased]` avant le PR

### ❌ Tu NE DOIS PAS faire
- Hard delete — UNIQUEMENT soft delete via `deletedAt`
- Stocker des mots de passe — auth déléguée à Keycloak
- Utiliser `any` en TypeScript
- Utiliser `console.log` (utiliser le Logger NestJS)
- Hardcoder des URLs, credentials, ou couleurs
- Modifier `.github/workflows/` — réservé aux humains
- Modifier `packages/audit/`, `packages/iam/`, `packages/compliance/` sans mission explicite
- Committer `node_modules/`, `.env`, ou fichiers binaires

### Format PR obligatoire
```
Titre : feat(db): Prisma schema + RLS — Mission 01 [LMSK-9, LMSK-10]

Corps :
## Tickets Jira
- LMSK-9 : Schéma Prisma (Tenant, User, Consent, AuditLog)
- LMSK-10 : Migrations RLS (Row Level Security)

## Fichiers créés/modifiés
- packages/db/prisma/schema.prisma
- packages/db/prisma/migrations/001_init.sql
- packages/db/src/index.ts
- packages/db/package.json

## Tests
- [ ] pnpm prisma validate ✅
- [ ] pnpm test (couverture > 80%) ✅
- [ ] Test isolation RLS cross-tenant ✅

## Checklist compliance
- [ ] Aucun hard delete
- [ ] tenantId sur toutes les tables
- [ ] PII avec @RetentionPolicy
- [ ] CHANGELOG.md mis à jour
```

## Architecture — Ce qui existe déjà (ne pas recréer)

```
packages/
├── core/src/types.ts          ← KernelModule, TenantContext (NE PAS MODIFIER)
├── core/src/module-registry.ts ← ModuleRegistry (NE PAS MODIFIER)
├── audit/src/audit-log.ts     ← AuditLog class (NE PAS MODIFIER — juste utiliser)
├── compliance/src/loi25-gate.ts ← Gate CI (NE PAS MODIFIER)
└── iam/src/types.ts           ← KernelRole, AuthenticatedUser (NE PAS MODIFIER)

apps/
├── api/src/main.ts            ← Bootstrap NestJS (NE PAS MODIFIER ce sprint)
├── api/src/app.module.ts      ← AppModule (ajouter DatabaseModule seulement)
└── web/                       ← Frontend (NE PAS TOUCHER ce sprint)
```

## Variables d'environnement disponibles dans Codespace

```bash
DATABASE_URL="postgresql://lms:lms@postgres:5432/lms_dev"
DATABASE_URL_SHADOW="postgresql://lms:lms@postgres:5432/lms_shadow"
KEYCLOAK_URL="http://keycloak:8080"
KEYCLOAK_REALM="lms"
KEYCLOAK_CLIENT_ID="lms-api"
```

Ces variables sont dans `.env.codespace` — déjà présentes, ne pas les modifier.
