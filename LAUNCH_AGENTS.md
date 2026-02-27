# LAUNCH_AGENTS — Prompts de démarrage pour agents IA

> Ce fichier contient les prompts prêts-à-copier pour lancer chaque mission dans Cursor, Copilot, ou tout autre agent IA.
> **Copie le bloc correspondant à la mission, colle-le dans ton agent, et laisse-le travailler.**

---

## Mission 01 — Prisma Database Schema + RLS

> **Branch à créer** : `feature/01-database-schema`

```
Tu es un agent IA travaillant sur le projet LMS Kernel (monorepo NestJS + Next.js).

AVANT DE COMMENCER :
1. Lis ARCHITECTURE.md
2. Lis agents/context/AGENT_ONBOARDING.md
3. Lis agents/missions/01-setup-database.md
4. Lis MODULE_CONTRACT.md

TON OBJECTIF : Implémenter le schéma Prisma complet + Row Level Security pour LMS Kernel.

RÈGLES ABSOLUES (ne jamais violer) :
- Ne push jamais directement sur main/staging/develop — crée une PR depuis feature/01-database-schema
- Ne hardcode jamais de secrets — utilise process.env["VAR_NAME"]
- N'utilise que la région AWS ca-central-1 (Loi 25 Québec)
- Ne supprime jamais de records DB — utilise soft-delete (deletedAt)
- Ne retourne jamais any en TypeScript — toujours typé
- Labelle ta PR avec ai-generated
- Exécute pnpm typecheck && pnpm lint && pnpm test avant de créer la PR

WORKFLOW :
1. git checkout -b feature/01-database-schema
2. Crée packages/db/package.json (package @lms/db)
3. Crée packages/db/prisma/schema.prisma avec les entités suivantes :
   - Tenant (id, slug unique, name, isActive, modules, config)
   - User (id, tenantId, email, consentId, roles, createdAt, updatedAt, deletedAt — SOFT DELETE)
     → @@unique([tenantId, email]) + @@index([tenantId])
     → email est PII : doit avoir consentId (Loi 25)
   - Consent (id, tenantId, userId, categories String[], purpose, givenAt, expiresAt, withdrawnAt, ipHash)
   - AuditLog (id, tenantId, timestamp, action, actorId, actorType, resourceType, resourceId, metadata Json?, previousHash, hash @unique, dataRegion @default("ca-central-1"))
     → @@index([tenantId, timestamp]) + @@index([tenantId, action])
     → JAMAIS de UPDATE ou DELETE sur cette table
   - UserRole (enum : ADMIN, INSTRUCTOR, LEARNER, GUEST)
   - Course, Enrollment, Progress (entités LMS de base avec tenantId obligatoire)

4. Crée la migration SQL pour Row Level Security :
   packages/db/prisma/migrations/0001_enable_rls.sql
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Consent" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Progress" ENABLE ROW LEVEL SECURITY;

   -- Policy: tenant isolation — users only see their tenant's data
   CREATE POLICY tenant_isolation ON "User"
     USING ("tenantId" = current_setting('app.tenant_id')::uuid);
   CREATE POLICY tenant_isolation ON "Course"
     USING ("tenantId" = current_setting('app.tenant_id')::uuid);
   CREATE POLICY tenant_isolation ON "Enrollment"
     USING ("tenantId" = current_setting('app.tenant_id')::uuid);
   CREATE POLICY tenant_isolation ON "Progress"
     USING ("tenantId" = current_setting('app.tenant_id')::uuid);
   CREATE POLICY tenant_isolation ON "AuditLog"
     USING ("tenantId" = current_setting('app.tenant_id')::uuid);
   CREATE POLICY tenant_isolation ON "Consent"
     USING ("tenantId" = current_setting('app.tenant_id')::uuid);
   ```

5. Crée packages/db/src/index.ts — exporte PrismaClient singleton :
   - Utilise globalThis pour éviter les connexions multiples en dev (Next.js hot reload)
   - Exporte aussi tous les types Prisma générés

6. Crée packages/db/src/seed.ts — seed de base :
   - 1 tenant de test (slug: "demo")
   - 1 user admin avec consentId
   - 1 consent associé

7. Checklist de conformité AVANT la PR :
   - [ ] Chaque entité a tenantId
   - [ ] Chaque entité avec PII a consentId
   - [ ] AuditLog n'a pas de UPDATE/DELETE dans les migrations
   - [ ] Policies RLS créées pour toutes les tables
   - [ ] Soft delete (deletedAt) sur User, pas de hard delete
   - [ ] npx prisma validate passe
   - [ ] pnpm typecheck && pnpm lint && pnpm test passent

8. Crée la PR :
   gh pr create \
     --title "feat(db): Prisma schema + RLS tenant isolation" \
     --body "Implements complete Prisma schema with Row Level Security for multi-tenant isolation. Closes LMSK-14." \
     --label "ai-generated" \
     --base develop

Référence les fichiers : agents/missions/01-setup-database.md pour les détails complets.
```

---

## Mission 02 — Auth (Keycloak + NestJS Guards)

> **Branch à créer** : `feature/02-auth`
> Prompt disponible après merge de Mission 01.

---

## Mission 03 — Courses & Video

> **Branch à créer** : `feature/03-courses-video`
> Prompt disponible après merge de Mission 02.

---

*Généré automatiquement — source of truth : `agents/missions/`*
