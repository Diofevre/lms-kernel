-- Row Level Security for multi-tenant isolation
-- Run AFTER initial Prisma migration

-- Helper function: get current tenant from session
CREATE OR REPLACE FUNCTION current_tenant_id_safe() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on all multi-tenant tables
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_objects ENABLE ROW LEVEL SECURITY;

-- Policies: fail-closed (no tenant = no access)
CREATE POLICY tenant_isolation ON tenant_users
  USING (tenant_id = current_tenant_id_safe())
  WITH CHECK (tenant_id = current_tenant_id_safe());

CREATE POLICY tenant_isolation ON audit_logs
  USING (tenant_id = current_tenant_id_safe());

CREATE POLICY tenant_isolation ON consent_records
  USING (tenant_id = current_tenant_id_safe())
  WITH CHECK (tenant_id = current_tenant_id_safe());

CREATE POLICY tenant_isolation ON data_subject_requests
  USING (tenant_id = current_tenant_id_safe())
  WITH CHECK (tenant_id = current_tenant_id_safe());

CREATE POLICY tenant_isolation ON storage_objects
  USING (tenant_id = current_tenant_id_safe())
  WITH CHECK (tenant_id = current_tenant_id_safe());

-- Application role: no UPDATE/DELETE on audit_logs (append-only)
-- CREATE ROLE kern_app LOGIN PASSWORD 'CHANGE_IN_PRODUCTION';
-- GRANT USAGE ON SCHEMA public TO kern_app;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO kern_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO kern_app;
-- REVOKE UPDATE, DELETE ON audit_logs FROM kern_app;
