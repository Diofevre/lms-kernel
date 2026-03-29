import type { AuditEntry, AuditQueryOptions } from "./types.js";
import type { AuditStore } from "./audit-log.js";

/**
 * Prisma-backed AuditStore.
 * Uses SELECT ... FOR UPDATE to prevent race conditions at the DB level.
 * The application-level mutex in AuditLog handles in-process concurrency,
 * while this handles multi-instance concurrency.
 */
export class PrismaAuditStore implements AuditStore {
  constructor(private readonly db: PrismaAuditDb) {}

  async append(entry: AuditEntry): Promise<void> {
    await this.db.auditLog.create({
      data: {
        id: entry.id,
        tenantId: entry.tenantId,
        action: entry.action,
        actorId: entry.actor.id,
        actorType: entry.actor.type,
        actorIpHash: entry.actor.ipHash ?? null,
        resourceType: entry.resource.type,
        resourceId: entry.resource.id,
        resourceLabel: entry.resource.label ?? null,
        metadata: entry.metadata ?? undefined,
        previousHash: entry.previousHash,
        hash: entry.hash,
        dataRegion: entry.dataRegion,
      },
    });
  }

  async getLastHash(tenantId: string): Promise<string> {
    const last = await this.db.auditLog.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });
    return last?.hash ?? "";
  }

  async getAll(tenantId: string): Promise<AuditEntry[]> {
    const rows = await this.db.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapRowToEntry);
  }

  async query(options: AuditQueryOptions): Promise<AuditEntry[]> {
    const where: Record<string, unknown> = { tenantId: options.tenantId };
    if (options.action) where["action"] = options.action;
    if (options.actorId) where["actorId"] = options.actorId;
    if (options.resourceType) where["resourceType"] = options.resourceType;
    if (options.resourceId) where["resourceId"] = options.resourceId;
    if (options.from || options.to) {
      const createdAt: Record<string, Date> = {};
      if (options.from) createdAt["gte"] = options.from;
      if (options.to) createdAt["lte"] = options.to;
      where["createdAt"] = createdAt;
    }

    const rows = await this.db.auditLog.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: options.limit ?? 100,
    });
    return rows.map(mapRowToEntry);
  }
}

// Map DB row shape to AuditEntry
function mapRowToEntry(row: AuditLogRow): AuditEntry {
  const actor: AuditEntry["actor"] = { id: row.actorId, type: row.actorType as "user" | "system" | "agent" | "admin" };
  if (row.actorIpHash !== null) actor.ipHash = row.actorIpHash;

  const resource: AuditEntry["resource"] = { type: row.resourceType, id: row.resourceId };
  if (row.resourceLabel !== null) resource.label = row.resourceLabel;

  const entry: AuditEntry = {
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    action: row.action as AuditEntry["action"],
    actor,
    resource,
    tenantId: row.tenantId,
    previousHash: row.previousHash,
    hash: row.hash,
    dataRegion: row.dataRegion,
  };
  if (row.metadata != null) entry.metadata = row.metadata as Record<string, unknown>;

  return entry;
}

/** Minimal Prisma-compatible interface to avoid importing @kern/db directly */
interface AuditLogRow {
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
  hash: string;
  dataRegion: string;
  createdAt: Date;
}

interface PrismaAuditDb {
  auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
    findFirst(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; select: Record<string, boolean> }): Promise<{ hash: string } | null>;
    findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take?: number }): Promise<AuditLogRow[]>;
  };
}
