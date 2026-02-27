-- Migration générée manuellement — NE PAS MODIFIER
-- [LMSK-9] Schéma Prisma initial

CREATE TYPE "UserRole" AS ENUM (
  'SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'LEARNER', 'AUDITOR'
);

CREATE TYPE "ConsentPurpose" AS ENUM (
  'REQUIRED', 'ANALYTICS', 'MARKETING'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : tenants [LMSK-14]
-- ─────────────────────────────────────────────────────────────────────────────
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

CREATE UNIQUE INDEX "tenants_slug_key"      ON "tenants"("slug");
CREATE INDEX        "tenants_slug_idx"      ON "tenants"("slug");
CREATE INDEX        "tenants_deletedAt_idx" ON "tenants"("deletedAt");

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : users [LMSK-15]
-- ─────────────────────────────────────────────────────────────────────────────
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

CREATE UNIQUE INDEX "users_keycloakId_key"         ON "users"("keycloakId");
CREATE UNIQUE INDEX "users_tenantId_email_key"     ON "users"("tenantId", "email");
CREATE INDEX        "users_tenantId_idx"           ON "users"("tenantId");
CREATE INDEX        "users_keycloakId_idx"         ON "users"("keycloakId");
CREATE INDEX        "users_tenantId_deletedAt_idx" ON "users"("tenantId", "deletedAt");

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : consents [LMSK-16]
-- ─────────────────────────────────────────────────────────────────────────────
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

CREATE INDEX "consents_tenantId_userId_idx"  ON "consents"("tenantId", "userId");
CREATE INDEX "consents_tenantId_purpose_idx" ON "consents"("tenantId", "purpose");

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : audit_logs [LMSK-17]
-- ─────────────────────────────────────────────────────────────────────────────
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

CREATE UNIQUE INDEX "audit_logs_hash_key"                   ON "audit_logs"("hash");
CREATE INDEX        "audit_logs_tenantId_createdAt_idx"    ON "audit_logs"("tenantId", "createdAt");
CREATE INDEX        "audit_logs_tenantId_entity_idx"       ON "audit_logs"("tenantId", "entityType", "entityId");
CREATE INDEX        "audit_logs_tenantId_actorId_idx"      ON "audit_logs"("tenantId", "actorId");

-- ─────────────────────────────────────────────────────────────────────────────
-- FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consents" ADD CONSTRAINT "consents_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consents" ADD CONSTRAINT "consents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
