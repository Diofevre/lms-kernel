/**
 * @lms/audit — Immutable audit log types
 *
 * Audit entries are append-only and form a hash chain:
 * each entry contains the SHA-256 hash of the previous entry.
 * This makes tampering detectable.
 *
 * Compliance: Loi 25 (Quebec), LPRPDE, institutional requirements.
 */

export type AuditAction =
  // Auth
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "auth.password_changed"
  | "auth.mfa_enabled"
  | "auth.mfa_disabled"
  // Data subject rights (Loi 25)
  | "privacy.data_access_requested"
  | "privacy.data_exported"
  | "privacy.data_deletion_requested"
  | "privacy.data_deleted"
  | "privacy.consent_given"
  | "privacy.consent_withdrawn"
  | "privacy.breach_detected"
  | "privacy.breach_reported"
  // Administration
  | "admin.user_created"
  | "admin.user_suspended"
  | "admin.user_deleted"
  | "admin.role_assigned"
  | "admin.role_revoked"
  | "admin.tenant_created"
  | "admin.module_enabled"
  | "admin.module_disabled"
  // Content
  | "content.course_published"
  | "content.course_unpublished"
  | "content.exam_started"
  | "content.exam_submitted"
  | "content.grade_assigned"
  // Security
  | "security.suspicious_activity"
  | "security.api_key_rotated"
  | "security.secret_accessed";

export interface AuditEntry {
  /** UUID v4 */
  id: string;

  /** ISO 8601 timestamp — set by the server, not the client */
  timestamp: string;

  /** The action that occurred */
  action: AuditAction;

  /** Who performed the action */
  actor: AuditActor;

  /** What was affected */
  resource: AuditResource;

  /** Additional context (sanitized — no PII unless strictly necessary) */
  metadata?: Record<string, unknown>;

  /** Tenant this entry belongs to */
  tenantId: string;

  /** SHA-256 of the previous entry — enables tamper detection */
  previousHash: string;

  /** SHA-256 of this entry (computed after all fields are set) */
  hash: string;

  /** Data region — must be ca-central-1 for Loi 25 */
  dataRegion: string;
}

export interface AuditActor {
  /** User ID or "system" for automated actions */
  id: string;
  type: "user" | "system" | "agent" | "admin";
  /** IP address — stored hashed for privacy */
  ipHash?: string;
}

export interface AuditResource {
  type: string;
  id: string;
  /** Human-readable label */
  label?: string;
}

export interface AuditQueryOptions {
  tenantId: string;
  action?: AuditAction;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}
