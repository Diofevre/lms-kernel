# Mission 01 — Setup Prisma Database Schema

**Branch**: `feature/01-database-schema`
**Estimated complexity**: Medium
**Prerequisites**: Read AGENT_ONBOARDING.md, ARCHITECTURE.md

---

## Objective

Create the complete Prisma schema for the LMS Kernel core entities.

## Files to create/modify

- `packages/db/prisma/schema.prisma` — main schema
- `packages/db/package.json` — DB package
- `packages/db/src/index.ts` — Prisma client export

## Schema requirements

### Required entities

```prisma
// Tenant — one record per organization
model Tenant {
  id        String  @id @default(uuid())
  slug      String  @unique  // subdomain identifier
  name      String
  isActive  Boolean @default(true)
  // ... modules list, config
}

// User — scoped to tenant
model User {
  id        String    @id @default(uuid())
  tenantId  String
  email     String    // @RetentionPolicy(days: 2555) — 7 years
  // Loi 25: email is PII — must have consent_id
  consentId String    // FK to Consent
  roles     UserRole[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // SOFT DELETE ONLY

  @@unique([tenantId, email])
  @@index([tenantId])
}

// Consent — Loi 25 requirement
model Consent {
  id         String   @id @default(uuid())
  tenantId   String
  userId     String
  categories String[] // PIICategory values
  purpose    String
  givenAt    DateTime
  expiresAt  DateTime?
  withdrawnAt DateTime?
  ipHash     String   // hashed IP, not raw
}

// AuditLog — append-only, NEVER allow UPDATE or DELETE
model AuditLog {
  id           String   @id @default(uuid())
  tenantId     String
  timestamp    DateTime
  action       String
  actorId      String
  actorType    String
  resourceType String
  resourceId   String
  metadata     Json?
  previousHash String
  hash         String   @unique
  dataRegion   String   @default("ca-central-1")

  @@index([tenantId, timestamp])
  @@index([tenantId, action])
}
```

### Required: Row Level Security SQL

Create a migration file that enables RLS on all tables:
```sql
-- Enable RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their tenant's data
CREATE POLICY tenant_isolation ON "User"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

## Compliance checklist before PR

- [ ] Every entity has `tenantId`
- [ ] Every entity with PII has `consentId`
- [ ] `AuditLog` has no UPDATE/DELETE in migrations
- [ ] RLS policies created for all tables
- [ ] All `DateTime` fields use `@default(now())` or are explicitly set
- [ ] Soft delete (`deletedAt`) on User, not hard delete

## Tests required

- [ ] Prisma schema validates (`npx prisma validate`)
- [ ] Migrations apply cleanly (`prisma migrate dev`)
- [ ] RLS correctly blocks cross-tenant access (write a test)
