import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate all personal data held for a user.
   * Loi 25 Art. 27 -- right of access.
   */
  async getUserData(userId: string, tenantId: string) {
    const [user, consents, requests, auditLogs] = await Promise.all([
      this.prisma.tenantUser.findFirst({
        where: { keycloakId: userId, tenantId, deletedAt: null },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          roles: true,
          isActive: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.consentRecord.findMany({
        where: { userId, tenantId },
        orderBy: { givenAt: "desc" },
      }),
      this.prisma.dataSubjectRequest.findMany({
        where: { userId, tenantId },
        orderBy: { requestedAt: "desc" },
      }),
      this.prisma.auditLog.findMany({
        where: { tenantId, actorId: userId },
        orderBy: { createdAt: "desc" },
        take: 100, // Last 100 audit entries involving this user
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      user: user ?? { note: "No user profile record found" },
      consents,
      dataSubjectRequests: requests,
      recentAuditActivity: auditLogs,
    };
  }

  /**
   * Create a data subject request (access, correction, deletion).
   * Loi 25 requires completion within 30 days.
   */
  async createRequest(userId: string, tenantId: string, type: string, metadata?: Record<string, unknown>) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    return this.prisma.dataSubjectRequest.create({
      data: {
        tenantId,
        userId,
        type,
        status: "pending",
        deadline,
      },
    });
  }

  /**
   * List all data subject requests for a tenant.
   */
  async getRequests(tenantId: string) {
    return this.prisma.dataSubjectRequest.findMany({
      where: { tenantId },
      orderBy: { requestedAt: "desc" },
    });
  }

  /**
   * Process (approve/deny) a data subject request.
   */
  async processRequest(requestId: string, action: string, reason?: string) {
    const request = await this.prisma.dataSubjectRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException(`Data subject request "${requestId}" not found`);
    }

    const status = action === "approved" ? "completed" : "denied";

    const updateData: Record<string, unknown> = { status, denialReason: reason ?? null };
    if (action === "approved") {
      updateData["completedAt"] = new Date();
    }
    const updated = await this.prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    // If approved deletion request, schedule actual data removal
    if (action === "approved" && request.type === "deletion") {
      // In production, this would enqueue a background job
      // For now, soft-delete the user
      await this.prisma.tenantUser.updateMany({
        where: { keycloakId: request.userId, tenantId: request.tenantId },
        data: { deletedAt: new Date() },
      });
    }

    return updated;
  }
}
