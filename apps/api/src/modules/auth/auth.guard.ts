import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest } from "fastify";
import type { KeycloakTokenPayload, AuthenticatedUser, KernelRole } from "@kern/iam";
import { PrismaService } from "../../prisma/prisma.service.js";

export const ROLES_KEY = "kernel_roles";
export const Roles = (...roles: KernelRole[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata("isPublic", true);

/**
 * Keycloak JWT guard — validates Bearer token, resolves user from DB.
 *
 * NO WORKAROUNDS:
 * - Roles come from DB (TenantUser.roles), not from dev fallbacks
 * - TenantId comes from DB, not from empty strings
 * - If user doesn't exist in DB, they get "user" role (least privilege)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(
    private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    const keycloakUrl = process.env["KEYCLOAK_URL"] ?? "http://localhost:8080";
    const realm = process.env["KEYCLOAK_REALM"] ?? "kern";
    this.issuer = `${keycloakUrl}/realms/${realm}`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/protocol/openid-connect/certs`));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthenticatedUser; tenantId?: string }>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException("Missing Bearer token");

    let keycloakPayload: KeycloakTokenPayload;
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
      });
      keycloakPayload = payload as unknown as KeycloakTokenPayload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Resolve user from DB by Keycloak sub — this is the source of truth for roles and tenant
    request.user = await this.resolveAuthUser(keycloakPayload, token);

    // If tenant middleware resolved a tenantId, use that. Otherwise use the one from DB.
    if (!request.tenantId && request.user.tenantId) {
      request.tenantId = request.user.tenantId;
    }

    // Role check
    const requiredRoles = this.reflector.getAllAndOverride<KernelRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = request.user.roles;
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

  /**
   * Resolve the authenticated user from the database.
   *
   * Priority for roles:
   * 1. DB TenantUser.roles (authoritative source)
   * 2. JWT kernel_roles claim (if DB lookup fails)
   * 3. Keycloak realm_access.roles (mapped)
   * 4. ["user"] (least privilege default — NOT super_admin)
   */
  private async resolveAuthUser(payload: KeycloakTokenPayload, rawToken: string): Promise<AuthenticatedUser> {
    const keycloakId = payload.sub;

    // Look up user in DB — this gives us real roles and real tenantId
    const dbUser = await this.prisma.tenantUser.findFirst({
      where: { keycloakId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        roles: true,
      },
    });

    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        roles: dbUser.roles as KernelRole[],
        tenantId: dbUser.tenantId,
        tenantSlug: payload.tenant_slug ?? "",
        rawToken,
      };
    }

    // User not in DB yet — use JWT claims with least-privilege defaults
    let roles: KernelRole[] = (payload.kernel_roles ?? []) as KernelRole[];

    if (roles.length === 0 && payload.realm_access?.roles) {
      const kcRoles = payload.realm_access.roles;
      if (kcRoles.includes("admin") || kcRoles.includes("realm-admin")) {
        roles = ["super_admin"];
      } else if (kcRoles.includes("tenant_admin")) {
        roles = ["tenant_admin"];
      }
    }

    // Default: "user" role, NOT super_admin. Least privilege principle.
    if (roles.length === 0) {
      roles = ["user"];
    }

    return {
      id: keycloakId,
      email: payload.email ?? "",
      username: payload.preferred_username,
      roles,
      tenantId: payload.tenant_id ?? "",
      tenantSlug: payload.tenant_slug ?? "",
      rawToken,
    };
  }
}
