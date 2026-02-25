/**
 * @lms/iam — Identity & Access Management types
 *
 * Auth flow: Client → API → Keycloak OIDC token validation → Guard → Handler
 * Multi-tenant: tenant slug extracted from subdomain → injected into request context
 */

/** Roles hierarchy — coarse-grained, Keycloak manages fine-grained permissions */
export type KernelRole =
  | "super_admin"        // Platform-level (our team only)
  | "tenant_admin"       // Organisation administrator
  | "instructor"         // Course instructor / trainer
  | "student"            // Learner
  | "proctor"            // Exam supervisor (télésurveillance)
  | "auditor"            // Read-only audit log access
  | "privacy_officer";   // RPP — Responsable protection renseignements personnels

/** Decoded JWT payload from Keycloak */
export interface KeycloakTokenPayload {
  sub: string;           // User ID (UUID)
  iss: string;           // Keycloak issuer URL
  aud: string | string[];
  exp: number;
  iat: number;
  jti: string;           // JWT ID — used for token revocation checks
  preferred_username: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  // Custom claims added by Keycloak mapper
  tenant_id?: string;
  tenant_slug?: string;
  kernel_roles?: KernelRole[];
}

/** Request context after authentication — available in all guards/controllers */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  roles: KernelRole[];
  tenantId: string;
  tenantSlug: string;
  /** Raw JWT — for forwarding to downstream services */
  rawToken: string;
}

/** Guard metadata */
export interface RequireRolesOptions {
  roles: KernelRole[];
  /** If true, user needs ALL roles (AND). If false, any role suffices (OR, default) */
  requireAll?: boolean;
}

/** Tenant resolution result */
export interface TenantResolution {
  id: string;
  slug: string;
  keycloakRealm: string;
  isActive: boolean;
}
