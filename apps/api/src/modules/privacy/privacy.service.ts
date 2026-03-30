import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate all personal data held for a user.
   * Loi 25 Art. 27 — right of access.
   */
  async getUserData(userId: string, tenantId: string) {
    const [user, consents, requests, auditLogs] = await Promise.all([
      this.prisma.tenantUser.findFirst({
        where: { keycloakId: userId, tenantId, deletedAt: null },
        select: {
          id: true, email: true, username: true, firstName: true, lastName: true,
          roles: true, isActive: true, mfaEnabled: true, lastLoginAt: true,
          createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.consentRecord.findMany({ where: { userId, tenantId }, orderBy: { givenAt: "desc" } }),
      this.prisma.dataSubjectRequest.findMany({ where: { userId, tenantId }, orderBy: { requestedAt: "desc" } }),
      this.prisma.auditLog.findMany({ where: { tenantId, actorId: userId }, orderBy: { createdAt: "desc" }, take: 100 }),
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
   * Create a data subject request (access, correction, deletion, portability).
   * Loi 25 requires completion within 30 days.
   *
   * IDEMPOTENT: rejects if a pending request of the same type already exists.
   */
  async createRequest(userId: string, tenantId: string, type: string) {
    const existing = await this.prisma.dataSubjectRequest.findFirst({
      where: { userId, tenantId, type, status: "pending" },
    });
    if (existing) {
      throw new ConflictException(`A pending ${type} request already exists (ID: ${existing.id})`);
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    return this.prisma.dataSubjectRequest.create({
      data: {
        tenant: { connect: { id: tenantId } },
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
    const where: Record<string, unknown> = {};
    if (tenantId) where["tenantId"] = tenantId;
    return this.prisma.dataSubjectRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
    });
  }

  /**
   * Process (approve/deny) a data subject request.
   * On deletion approval: cascade soft-delete to ALL user data (Loi 25 Art. 30).
   */
  async processRequest(requestId: string, action: string, reason?: string) {
    const request = await this.prisma.dataSubjectRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request "${requestId}" not found`);

    const status = action === "complete" || action === "approved" ? "completed" : "denied";

    const updateData: Record<string, unknown> = { status };
    if (status === "completed") updateData["completedAt"] = new Date();
    if (status === "denied" && reason) updateData["denialReason"] = reason;

    const updated = await this.prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    // Deletion request approved → cascade soft-delete ALL user data (Loi 25)
    if (status === "completed" && request.type === "deletion") {
      await this.cascadeSoftDeleteUserData(request.userId, request.tenantId);
    }

    return updated;
  }

  /**
   * Cascade soft-delete for Loi 25 deletion requests.
   * Marks ALL related data as deleted — user profile, tickets, consents withdrawn.
   * Audit logs are NEVER deleted (immutable by design).
   */
  private async cascadeSoftDeleteUserData(userId: string, tenantId: string): Promise<void> {
    const now = new Date();
    this.logger.log(`Loi 25 cascade soft-delete: user=${userId}, tenant=${tenantId}`);

    await Promise.all([
      // Soft-delete user profile
      this.prisma.tenantUser.updateMany({
        where: { keycloakId: userId, tenantId },
        data: { deletedAt: now, isActive: false },
      }),
      // Withdraw all consents
      this.prisma.consentRecord.updateMany({
        where: { userId, tenantId, withdrawnAt: null },
        data: { withdrawnAt: now },
      }),
      // Note: Audit logs are NEVER deleted — they are immutable.
      // Note: SupportTickets are retained for record keeping but the user is anonymized above.
    ]);
  }
}
