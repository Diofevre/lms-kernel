# ADR 0003 — PostgreSQL + Prisma + Row Level Security pour multi-tenant

**Date** : 2026-02-26
**Statut** : ✅ Accepté

## Contexte

Le kernel doit supporter plusieurs organisations (tenants) avec isolation complète des données. Une fuite inter-tenant est inacceptable (Loi 25, confiance institutionnelle).

## Décision

- **PostgreSQL 16** comme base de données principale
- **Prisma** comme ORM (type-safe, migrations versionnées, `schema.prisma` comme source de vérité)
- **Row Level Security (RLS)** au niveau PostgreSQL pour garantir l'isolation des données même si le code applicatif fait une erreur

## Raisons

1. **RLS** = filet de sécurité DB-level : même si un développeur oublie le filtre `tenantId`, PostgreSQL bloque l'accès aux données d'un autre tenant
2. **Prisma** génère des types TypeScript depuis le schema → zéro désynchronisation entre DB et code
3. **Migrations versionnées** → traçabilité complète de l'évolution du schéma (exigence institutionnelle)
4. **PostgreSQL** = standard enterprise, excellente conformité ACID, support natif UUID, JSON, RLS

## Pattern multi-tenant

```sql
-- Chaque requête applicative définit le tenant courant
SET app.tenant_id = 'uuid-du-tenant';

-- RLS vérifie automatiquement
CREATE POLICY tenant_isolation ON "Course"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

## Conséquences

- Chaque entité **doit** avoir `tenantId` (enforced par ESLint + gate CI)
- Les migrations sont irréversibles en production → revue obligatoire
- Performance : index sur `tenantId` obligatoire sur toute table
