# Mission 01 — Prisma Schema + Row Level Security
# =============================================================================
# Jira    : LMSK-9 (Schéma Prisma) + LMSK-10 (Migrations RLS)
# Sprint  : Sprint 01 — Foundation
# Branch  : feature/01-database-schema  ← créer depuis develop
# Agent   : Cursor Cloud
# Priorité: HIGHEST — bloque toutes les autres missions
#
# AVANT DE COMMENCER :
#   1. Lire agents/context/CODING_STANDARDS.md
#   2. Lire agents/context/SPRINT_01_BACKLOG.md
#   3. Vérifier que pnpm-lock.yaml existe sur develop (sinon stopper)
# =============================================================================

## Sous-tâches Jira (granularité maximale)

| Sous-tâche | Ticket  | Description                                    |
|------------|---------|------------------------------------------------|
| 1          | LMSK-14 | Créer modèle Tenant avec soft delete           |
| 2          | LMSK-15 | Créer modèle User (sans password, role enum)   |
| 3          | LMSK-16 | Créer modèle Consent (Loi 25 — purpose enum)   |
| 4          | LMSK-17 | Créer modèle AuditLog (append-only, hash chain)|
| 5          | LMSK-18 | Valider schema : pnpm prisma validate          |
| 6          | LMSK-19 | Tests unitaires types Prisma                   |
| 7          | LMSK-20 | Migration SQL : ENABLE ROW LEVEL SECURITY       |
| 8          | LMSK-21 | Migration SQL : CREATE POLICY par table        |
| 9          | LMSK-22 | Helper Prisma : SET app.tenant_id              |
| 10         | LMSK-23 | Test isolation cross-tenant                    |

---

## Fichiers à créer (liste exhaustive)

```
packages/db/
├── package.json                          ← nouveau
├── src/
│   ├── index.ts                          ← nouveau (exports)
│   ├── client.ts                         ← nouveau (PrismaClient singleton)
│   └── tenant-context.ts                 ← nouveau (SET app.tenant_id helper)
└── prisma/
    ├── schema.prisma                     ← nouveau (schéma complet)
    └── migrations/
        └── 20260226000000_init/
            ├── migration.sql             ← nouveau (tables + RLS)
            └── migration_rls.sql         ← nouveau (policies)
```

**Fichiers existants à modifier :**
```
apps/api/src/app.module.ts    ← ajouter DatabaseModule dans imports[]
CHANGELOG.md                  ← ajouter entrée dans [Unreleased]
pnpm-workspace.yaml           ← vérifier que "packages/*" est présent (ne pas modifier si ok)
```

---

## Sous-tâche 1 — package.json du package db [LMSK-14]

Créer `packages/db/package.json` :

```json
{
  "name": "@lms/db",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0"
  },
  "devDependencies": {
    "prisma": "^5.10.0"
  }
}
```

---

## Sous-tâche 2 — schema.prisma complet [LMSK-14, LMSK-15, LMSK-16, LMSK-17]

Créer `packages/db/prisma/schema.prisma` :

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("DATABASE_URL_SHADOW")
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANT — Une organisation = un tenant [LMSK-14]
// ─────────────────────────────────────────────────────────────────────────────
model Tenant {
  id        String    @id @default(uuid()) @db.Uuid
  slug      String    @unique              // sous-domaine : org.lms.example.com
  name      String
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?                      // SOFT DELETE — jamais hard delete

  users    User[]
  consents Consent[]

  @@index([slug])
  @@index([deletedAt])
  @@map("tenants")
}

// ─────────────────────────────────────────────────────────────────────────────
// USER — Scoped au tenant, auth déléguée à Keycloak [LMSK-15]
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  RÈGLE : Aucun champ password — Keycloak gère l'auth
// ⚠️  Loi 25 : email est PII — @RetentionPolicy(days: 2555)
model User {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @db.Uuid             // FK tenant — OBLIGATOIRE
  keycloakId      String    @unique              // ID Keycloak (sub du JWT)
  email           String    // @RetentionPolicy(days: 2555) — 7 ans (Loi 25)
  role            UserRole  @default(LEARNER)
  preferredLocale String    @default("fr")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?                      // SOFT DELETE uniquement

  tenant   Tenant    @relation(fields: [tenantId], references: [id])
  consents Consent[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([keycloakId])
  @@index([tenantId, deletedAt])
  @@map("users")
}

enum UserRole {
  SUPER_ADMIN     // accès cross-tenant (Diofevre seulement)
  TENANT_ADMIN    // admin d'une organisation
  INSTRUCTOR      // créateur de cours
  LEARNER         // apprenant
  AUDITOR         // lecture seule, rapports conformité
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSENT — Loi 25 : traçabilité du consentement [LMSK-16]
// ─────────────────────────────────────────────────────────────────────────────
model Consent {
  id          String       @id @default(uuid()) @db.Uuid
  tenantId    String       @db.Uuid
  userId      String       @db.Uuid
  purpose     ConsentPurpose
  givenAt     DateTime     @default(now())
  expiresAt   DateTime?
  revokedAt   DateTime?
  ipHash      String       // IP hashée (SHA-256) — jamais l'IP brute (Loi 25)
  userAgent   String?

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@index([tenantId, userId])
  @@index([tenantId, purpose])
  @@map("consents")
}

enum ConsentPurpose {
  REQUIRED     // fonctionnel — pas de choix
  ANALYTICS    // statistiques d'usage
  MARKETING    // communications marketing
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG — Append-only, chaîne SHA-256 [LMSK-17]
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  RÈGLE ABSOLUE : Jamais de UPDATE ou DELETE sur cette table
// ⚠️  La migration SQL doit interdire UPDATE/DELETE via une policy RLS
model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  actorId      String   @db.Uuid              // userId qui a fait l'action
  actorType    String   @default("user")      // "user" | "system" | "agent"
  action       String                          // ex: "user.created", "course.deleted"
  entityType   String                          // ex: "User", "Course"
  entityId     String   @db.Uuid
  metadata     Json?                           // données contextuelles (sanitisées)
  previousHash String                          // hash de l'entrée précédente
  hash         String   @unique               // SHA-256(id+tenantId+action+previousHash)
  dataRegion   String   @default("ca-central-1") // Loi 25 — résidence données
  createdAt    DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([tenantId, entityType, entityId])
  @@index([tenantId, actorId])
  @@map("audit_logs")
}
```

---

## Sous-tâche 3 — Migration SQL init + RLS [LMSK-20, LMSK-21]

Créer `packages/db/prisma/migrations/20260226000000_init/migration.sql` :

```sql
-- Migration générée par Prisma
-- NE PAS MODIFIER MANUELLEMENT

CREATE TYPE "UserRole" AS ENUM (
  'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'LEARNER', 'AUDITOR'
);

CREATE TYPE "ConsentPurpose" AS ENUM (
  'REQUIRED', 'ANALYTICS', 'MARKETING'
);

CREATE TABLE "tenants" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "slug"      TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ  NOT NULL,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_slug_idx"       ON "tenants"("slug");
CREATE INDEX "tenants_deletedAt_idx"  ON "tenants"("deletedAt");

CREATE TABLE "users" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"        UUID        NOT NULL,
  "keycloakId"      TEXT        NOT NULL,
  "email"           TEXT        NOT NULL,
  "role"            "UserRole"  NOT NULL DEFAULT 'LEARNER',
  "preferredLocale" TEXT        NOT NULL DEFAULT 'fr',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  "deletedAt"       TIMESTAMPTZ,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_keycloakId_key"       ON "users"("keycloakId");
CREATE UNIQUE INDEX "users_tenantId_email_key"   ON "users"("tenantId", "email");
CREATE INDEX "users_tenantId_idx"               ON "users"("tenantId");
CREATE INDEX "users_keycloakId_idx"             ON "users"("keycloakId");
CREATE INDEX "users_tenantId_deletedAt_idx"     ON "users"("tenantId", "deletedAt");

CREATE TABLE "consents" (
  "id"        UUID             NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  UUID             NOT NULL,
  "userId"    UUID             NOT NULL,
  "purpose"   "ConsentPurpose" NOT NULL,
  "givenAt"   TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ,
  "ipHash"    TEXT             NOT NULL,
  "userAgent" TEXT,
  CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"     UUID        NOT NULL,
  "actorId"      UUID        NOT NULL,
  "actorType"    TEXT        NOT NULL DEFAULT 'user',
  "action"       TEXT        NOT NULL,
  "entityType"   TEXT        NOT NULL,
  "entityId"     UUID        NOT NULL,
  "metadata"     JSONB,
  "previousHash" TEXT        NOT NULL,
  "hash"         TEXT        NOT NULL,
  "dataRegion"   TEXT        NOT NULL DEFAULT 'ca-central-1',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audit_logs_hash_key" ON "audit_logs"("hash");

-- Foreign keys
ALTER TABLE "users"    ADD CONSTRAINT "users_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consents" ADD CONSTRAINT "consents_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consents" ADD CONSTRAINT "consents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

Créer `packages/db/prisma/migrations/20260226000000_init/migration_rls.sql` :

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — Isolation multi-tenant [LMSK-20, LMSK-21]
-- ─────────────────────────────────────────────────────────────────────────────

-- Activer RLS sur toutes les tables tenant-scoped
ALTER TABLE "users"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consents"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Policy : lecture isolée par tenant
CREATE POLICY "tenant_isolation_users" ON "users"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);

CREATE POLICY "tenant_isolation_consents" ON "consents"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);

CREATE POLICY "tenant_isolation_audit_logs" ON "audit_logs"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid);

-- AuditLog : append-only — interdire UPDATE et DELETE
CREATE POLICY "audit_log_append_only_no_update" ON "audit_logs"
  AS RESTRICTIVE FOR UPDATE USING (false);

CREATE POLICY "audit_log_append_only_no_delete" ON "audit_logs"
  AS RESTRICTIVE FOR DELETE USING (false);

-- Rôle applicatif avec accès restreint
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lms_app') THEN
    CREATE ROLE lms_app LOGIN PASSWORD 'change_in_prod';
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON "users", "consents", "tenants" TO lms_app;
GRANT SELECT, INSERT ON "audit_logs" TO lms_app; -- pas UPDATE ni DELETE
```

---

## Sous-tâche 4 — Helper tenant context [LMSK-22]

Créer `packages/db/src/tenant-context.ts` :

```typescript
import { PrismaClient } from '@prisma/client'

/**
 * Exécute une requête Prisma dans le contexte d'un tenant.
 * SET app.tenant_id active les policies RLS automatiquement.
 *
 * @example
 * const users = await withTenantContext(prisma, tenantId, (tx) =>
 *   tx.user.findMany()
 * )
 */
export async function withTenantContext<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (prisma: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
    return fn(tx as unknown as PrismaClient)
  })
}
```

---

## Sous-tâche 5 — Client Prisma singleton [LMSK-14]

Créer `packages/db/src/client.ts` :

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

---

## Sous-tâche 6 — Index exports [LMSK-14]

Créer `packages/db/src/index.ts` :

```typescript
export { prisma } from './client'
export { withTenantContext } from './tenant-context'
export { PrismaClient, Prisma } from '@prisma/client'
export type { Tenant, User, Consent, AuditLog, UserRole, ConsentPurpose } from '@prisma/client'
```

---

## Sous-tâche 7 — Tests [LMSK-18, LMSK-19, LMSK-23]

Créer `packages/db/src/__tests__/schema.test.ts` :

```typescript
import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'

describe('Schéma Prisma — types et contraintes', () => {
  it('UserRole contient les 5 rôles attendus', () => {
    const roles = Object.values(Prisma.UserRole)
    expect(roles).toContain('SUPER_ADMIN')
    expect(roles).toContain('TENANT_ADMIN')
    expect(roles).toContain('INSTRUCTOR')
    expect(roles).toContain('LEARNER')
    expect(roles).toContain('AUDITOR')
  })

  it('ConsentPurpose contient les 3 valeurs Loi 25', () => {
    const purposes = Object.values(Prisma.ConsentPurpose)
    expect(purposes).toContain('REQUIRED')
    expect(purposes).toContain('ANALYTICS')
    expect(purposes).toContain('MARKETING')
  })
})

describe('withTenantContext — isolation RLS [LMSK-23]', () => {
  // Ces tests nécessitent une DB de test — ils passent dans le CI (Stage 2)
  // En local : DATABASE_URL doit pointer vers la DB de test
  it.todo('un user tenant A ne peut pas lire les users tenant B')
  it.todo('un audit_log ne peut pas être modifié (RLS append-only)')
  it.todo('SET app.tenant_id active correctement la policy')
})
```

---

## Sous-tâche 8 — Mise à jour app.module.ts

Modifier `apps/api/src/app.module.ts` — ajouter `DatabaseModule` :

```typescript
// Ajouter en haut des imports :
import { DatabaseModule } from './modules/database/database.module'

// Dans @Module({ imports: [...] }) ajouter :
DatabaseModule,
```

Créer `apps/api/src/modules/database/database.module.ts` :

```typescript
import { Global, Module } from '@nestjs/common'
import { prisma } from '@lms/db'

@Global()
@Module({
  providers: [
    {
      provide: 'PRISMA',
      useValue: prisma,
    },
  ],
  exports: ['PRISMA'],
})
export class DatabaseModule {}
```

---

## Sous-tâche 9 — CHANGELOG.md

Ajouter dans la section `[Unreleased]` de `CHANGELOG.md` :

```markdown
### Added
- `@lms/db` package : schéma Prisma (Tenant, User, Consent, AuditLog) [LMSK-9]
- Row Level Security (RLS) sur toutes les tables tenant-scoped [LMSK-10]
- Helper `withTenantContext()` pour isolation automatique par tenant [LMSK-22]
- Soft delete sur Tenant et User (champ `deletedAt`) [LMSK-14, LMSK-15]
- Conformité Loi 25 : Consent model avec purpose enum [LMSK-16]
- AuditLog append-only avec chaîne hash SHA-256 [LMSK-17]
```

---

## Commandes à lancer (dans cet ordre)

```bash
# 1. Depuis la racine du projet dans le Codespace
pnpm install                              # s'assurer que tout est installé

# 2. Générer le client Prisma
cd packages/db
pnpm db:generate

# 3. Valider le schéma [LMSK-18]
pnpm prisma validate

# 4. Créer la migration (si pas encore faite)
pnpm db:migrate --name init

# 5. Lancer les tests [LMSK-19]
cd ../..
pnpm test --filter @lms/db

# 6. Vérifier la couverture (doit être >= 80%)
pnpm test --coverage --filter @lms/db
```

---

## Critères de validation avant PR

```
✅ pnpm prisma validate → aucune erreur
✅ pnpm test → tous les tests passent
✅ Aucun champ password dans le schéma
✅ deletedAt présent sur Tenant et User
✅ tenantId UUID sur users, consents, audit_logs
✅ Migration RLS créée avec policies
✅ withTenantContext() exporté depuis @lms/db
✅ CHANGELOG.md mis à jour
✅ Titre PR contient [LMSK-9, LMSK-10]
✅ Aucun fichier node_modules/ commité
```
