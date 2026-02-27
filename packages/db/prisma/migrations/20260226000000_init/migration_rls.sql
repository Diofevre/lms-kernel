-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — Isolation multi-tenant [LMSK-20, LMSK-21]
-- ─────────────────────────────────────────────────────────────────────────────

-- Activer RLS sur toutes les tables tenant-scoped
ALTER TABLE "users"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consents"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Policy : lecture/écriture isolée par tenant
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
