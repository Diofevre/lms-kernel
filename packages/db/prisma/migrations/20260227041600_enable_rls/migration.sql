-- =============================================================================
-- LMS Kernel — Row Level Security (RLS)
-- Multi-tenant isolation at the database level
--
-- Every table with tenantId gets an RLS policy that restricts access
-- to rows matching the current app.tenant_id session variable.
--
-- Usage: SET app.tenant_id = '<tenant-uuid>'; before queries
-- =============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Progress" ENABLE ROW LEVEL SECURITY;

-- Tenant table: tenants can only see themselves
CREATE POLICY tenant_isolation_tenant ON "Tenant"
  USING ("id" = current_setting('app.tenant_id', true));

-- User: tenant isolation
CREATE POLICY tenant_isolation_user ON "User"
  USING ("tenantId" = current_setting('app.tenant_id', true));

-- Consent: tenant isolation
CREATE POLICY tenant_isolation_consent ON "Consent"
  USING ("tenantId" = current_setting('app.tenant_id', true));

-- AuditLog: tenant isolation (append-only — no UPDATE/DELETE policies)
CREATE POLICY tenant_isolation_audit_log ON "AuditLog"
  USING ("tenantId" = current_setting('app.tenant_id', true));

-- Course: tenant isolation
CREATE POLICY tenant_isolation_course ON "Course"
  USING ("tenantId" = current_setting('app.tenant_id', true));

-- Enrollment: tenant isolation
CREATE POLICY tenant_isolation_enrollment ON "Enrollment"
  USING ("tenantId" = current_setting('app.tenant_id', true));

-- Progress: tenant isolation
CREATE POLICY tenant_isolation_progress ON "Progress"
  USING ("tenantId" = current_setting('app.tenant_id', true));

-- =============================================================================
-- AuditLog protection: revoke UPDATE and DELETE from the application role
-- The audit log is append-only — tampering must be prevented at DB level
-- =============================================================================
REVOKE UPDATE, DELETE ON "AuditLog" FROM PUBLIC;
