import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find or create a TenantUser record from the Keycloak JWT claims.
   * Called on GET /auth/me to return real user data from the DB.
   */
  async findOrSyncUser(keycloakId: string, tenantId: string, claims: {
    email: string;
    username: string;
    roles: string[];
  }) {
    // Try to find existing user
    let user = await this.prisma.tenantUser.findFirst({
      where: { keycloakId, tenantId, deletedAt: null },
    });

    if (user) {
      // Update lastLoginAt on each /me call
      user = await this.prisma.tenantUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } else {
      // Auto-provision user from Keycloak claims (first login)
      user = await this.prisma.tenantUser.create({
        data: {
          tenantId,
          keycloakId,
          email: claims.email,
          username: claims.username,
          roles: claims.roles.length > 0 ? claims.roles : ["user"],
        },
      });
    }

    return {
      id: user.id,
      keycloakId: user.keycloakId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      tenantId: user.tenantId,
    };
  }
}
