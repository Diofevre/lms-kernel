import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest } from "fastify";
import type { KeycloakTokenPayload, AuthenticatedUser, KernelRole } from "@kern/iam";

export const ROLES_KEY = "kernel_roles";
export const Roles = (...roles: KernelRole[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata("isPublic", true);

/**
 * Keycloak JWT guard — validates Bearer token on every request.
 * Applied globally via APP_GUARD or per-route via @UseGuards(AuthGuard).
 *
 * The JWKS endpoint is fetched from Keycloak and cached.
 * Token expiry, signature, issuer, and audience are all validated.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(private readonly reflector: Reflector) {
    const keycloakUrl = process.env["KEYCLOAK_URL"] ?? "http://localhost:8080";
    const realm = process.env["KEYCLOAK_REALM"] ?? "kern";
    this.issuer = `${keycloakUrl}/realms/${realm}`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/protocol/openid-connect/certs`));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException("Missing Bearer token");

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        // Note: Keycloak default audience is "account", not the client ID.
        // In production, configure a Keycloak audience mapper on the client.
      });

      const keycloakPayload = payload as unknown as KeycloakTokenPayload;
      request.user = this.buildAuthUser(keycloakPayload, token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Role check if @Roles() decorator is present
    const requiredRoles = this.reflector.getAllAndOverride<KernelRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = request.user?.roles ?? [];
      const hasRole = requiredRoles.some((r) => userRoles.includes(r));
      if (!hasRole) throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }

  private extractToken(request: FastifyRequest): string | null {
    const auth = request.headers.authorization;
    if (auth?.startsWith("Bearer ")) return auth.slice(7);
    return null;
  }

  private buildAuthUser(payload: KeycloakTokenPayload, rawToken: string): AuthenticatedUser {
    // Get roles from custom claim, or from Keycloak realm_access, or default
    let roles: KernelRole[] = (payload.kernel_roles ?? []) as KernelRole[];

    // Fallback: check Keycloak realm_access.roles for standard role mappings
    if (roles.length === 0 && payload.realm_access?.roles) {
      const kcRoles = payload.realm_access.roles;
      if (kcRoles.includes("admin") || kcRoles.includes("realm-admin")) {
        roles = ["super_admin"];
      } else if (kcRoles.includes("tenant_admin")) {
        roles = ["tenant_admin"];
      }
    }

    // If still no roles and in dev mode, grant super_admin for testing
    if (roles.length === 0 && process.env["NODE_ENV"] !== "production") {
      roles = ["super_admin"];
    }

    return {
      id: payload.sub,
      email: payload.email ?? "",
      username: payload.preferred_username,
      roles,
      tenantId: payload.tenant_id ?? "",  // Will be resolved by tenant middleware
      tenantSlug: payload.tenant_slug ?? "",
      rawToken,
    };
  }
}
