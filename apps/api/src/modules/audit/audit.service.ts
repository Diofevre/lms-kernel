import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service.js";

/** Deterministic JSON.stringify with sorted keys — must match @kern/audit */
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

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async queryLogs(
    tenantId: string,
    options: { from?: string; to?: string; action?: string; limit?: number },
  ) {
    const where: Record<string, unknown> = {};
    // tenantId filter: always applied unless explicitly empty (super_admin ?all=true)
    if (tenantId) {
      where["tenantId"] = tenantId;
    }

    if (options.action) {
      where["action"] = options.action;
    }

    if (options.from || options.to) {
      const createdAt: Record<string, Date> = {};
      if (options.from) createdAt["gte"] = new Date(options.from);
      if (options.to) createdAt["lte"] = new Date(options.to);
      where["createdAt"] = createdAt;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
    });
  }

  async verifyChain(tenantId: string) {
    const entries = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    if (entries.length === 0) {
      return { valid: true, totalEntries: 0, broken: [] };
    }

    const broken: string[] = [];

    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]!;
      const curr = entries[i]!;

      // Check that current entry's previousHash matches the previous entry's hash
      if (curr.previousHash !== prev.hash) {
        broken.push(
          `Entry ${curr.id}: previousHash mismatch (expected ${prev.hash}, got ${curr.previousHash})`,
        );
      }

      // Recompute hash and verify it has not been tampered with
      const recomputed = this.computeHash(curr);
      if (recomputed !== curr.hash) {
        broken.push(`Entry ${curr.id}: hash tampered (recomputed does not match stored)`);
      }
    }

    return {
      valid: broken.length === 0,
      totalEntries: entries.length,
      broken,
    };
  }

  private computeHash(entry: {
    id: string;
    tenantId: string;
    action: string;
    actorId: string;
    actorType: string;
    actorIpHash: string | null;
    resourceType: string;
    resourceId: string;
    resourceLabel: string | null;
    metadata: unknown;
    previousHash: string;
    dataRegion: string;
    createdAt: Date;
  }): string {
    const data = {
      action: entry.action,
      actor: {
        id: entry.actorId,
        ...(entry.actorIpHash ? { ipHash: entry.actorIpHash } : {}),
        type: entry.actorType,
      },
      dataRegion: entry.dataRegion,
      id: entry.id,
      ...(entry.metadata != null ? { metadata: entry.metadata } : {}),
      previousHash: entry.previousHash,
      resource: {
        id: entry.resourceId,
        ...(entry.resourceLabel ? { label: entry.resourceLabel } : {}),
        type: entry.resourceType,
      },
      tenantId: entry.tenantId,
      timestamp: entry.createdAt.toISOString(),
    };
    return createHash("sha256").update(deterministicStringify(data)).digest("hex");
  }
}
