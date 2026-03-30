import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { subject: string; description: string; priority?: string }, userId: string, tenantId: string) {
    return this.prisma.supportTicket.create({
      data: {
        tenant: { connect: { id: tenantId } },
        userId,
        subject: data.subject,
        description: data.description,
        priority: data.priority ?? "medium",
      },
    });
  }

  async findByTenant(tenantId: string, options?: { status?: string | undefined; page?: number | undefined; limit?: number | undefined }) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (tenantId) where["tenantId"] = tenantId;
    if (options?.status) where["status"] = options.status;

    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findByUser(userId: string) {
    return this.prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  async updateStatus(id: string, status: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    const data: Record<string, unknown> = { status };
    if (status === "resolved" && ticket.status !== "resolved") data["resolvedAt"] = new Date();
    return this.prisma.supportTicket.update({ where: { id }, data });
  }
}
