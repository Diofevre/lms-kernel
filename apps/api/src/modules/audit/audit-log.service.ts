import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service.js";

/**
 * AuditLogService — wraps PrismaService for audit log writes.
 * Used by the global AuditInterceptor.
 *
 * Exists as a separate service so the interceptor doesn't need
 * to inject PrismaService directly (which fails when registered
 * globally via APP_INTERCEPTOR due to DI scope issues).
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async saveEntry(params: {
    tenantId: string;
    action: string;
    actorId: string;
    actorIpHash: string | null;
    resourceId: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const last = await this.prisma.auditLog.findFirst({
      where: { tenantId: params.tenantId },
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });
    const previousHash = last?.hash ?? "";

    const entry = {
      id: randomUUID(),
      tenantId: params.tenantId,
      action: params.action,
      actorId: params.actorId,
      actorType: "user",
      actorIpHash: params.actorIpHash,
      resourceType: "api",
      resourceId: params.resourceId,
      metadata: params.metadata,
      previousHash,
      dataRegion: process.env["DATA_REGION"] ?? "ca-central-1",
    };

    // Deterministic hash (sorted keys) — must match @kern/audit
    const hashInput = deterministicStringify(entry);
    const hash = createHash("sha256").update(hashInput).digest("hex");

    await this.prisma.auditLog.create({
      data: {
        id: entry.id,
        tenant: { connect: { id: entry.tenantId } },
        action: entry.action,
        actorId: entry.actorId,
        actorType: entry.actorType,
        actorIpHash: entry.actorIpHash,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata as object,
        previousHash: entry.previousHash,
        hash,
        dataRegion: entry.dataRegion,
      },
    });
  }
}

function deterministicStringify(obj: unknown): string {
  return JSON.stringify(obj, (_key, value: unknown) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}
