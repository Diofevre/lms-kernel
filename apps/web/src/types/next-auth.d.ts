import "next-auth";
import "next-auth/jwt";

/**
 * Proper type augmentation for NextAuth.
 * Eliminates all `as any` casts throughout the codebase.
 */
declare module "next-auth" {
  interface Session {
    accessToken?: string | undefined;
    error?: string | undefined;
    userRoles?: string[] | undefined;
    tenantId?: string | undefined;
  }

  interface User {
    accessToken?: string | undefined;
    refreshToken?: string | undefined;
    roles?: string[] | undefined;
    tenantId?: string | undefined;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string | undefined;
    refreshToken?: string | undefined;
    provider?: string | undefined;
    expiresAt?: number | undefined;
    error?: string | undefined;
    userRoles?: string[] | undefined;
    tenantId?: string | undefined;
  }
}
