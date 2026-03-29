import { createHash, randomUUID } from "crypto";
import type { AuditEntry, AuditAction, AuditActor, AuditResource, AuditQueryOptions } from "./types.js";

/**
 * AuditLog — append-only, tamper-evident log with SHA-256 hash chain.
 *
 * Storage is delegated to an AuditStore adapter (PostgreSQL append-only table,
 * or AWS CloudTrail, etc.). The hash chain is computed here.
 *
 * IMPORTANT: The underlying table MUST have:
 *   - No UPDATE permissions (append-only)
 *   - No DELETE permissions
 *   - Row-level security scoped to tenant
 */
export class AuditLog {
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly store: AuditStore) {}

  private async withLock<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(tenantId) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.locks.set(tenantId, next);
    try {
      return await next;
    } finally {
      if (this.locks.get(tenantId) === next) {
        this.locks.delete(tenantId);
      }
    }
  }

  async log(
    action: AuditAction,
    actor: AuditActor,
    resource: AuditResource,
    tenantId: string,
    metadata?: Record<string, unknown>,
  ): Promise<AuditEntry> {
    return this.withLock(tenantId, async () => {
      const previousHash = await this.store.getLastHash(tenantId);

      const entry: Omit<AuditEntry, "hash"> = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        action,
        actor,
        resource,
        metadata: sanitizeMetadata(metadata),
        tenantId,
        previousHash,
        dataRegion: process.env["DATA_REGION"] ?? "ca-central-1",
      };

      const hash = computeHash(entry);
      const fullEntry: AuditEntry = { ...entry, hash };

      await this.store.append(fullEntry);
      return fullEntry;
    });
  }

  /** Verify the hash chain integrity for a tenant — detects tampering */
  async verifyChain(tenantId: string): Promise<VerificationResult> {
    const entries = await this.store.getAll(tenantId);
    const broken: string[] = [];

    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]!;
      const curr = entries[i]!;

      if (curr.previousHash !== prev.hash) {
        broken.push(`Entry ${curr.id}: previousHash mismatch (expected ${prev.hash})`);
      }

      const { hash: _hash, ...dataWithoutHash } = curr;
      const recomputed = computeHash(dataWithoutHash as Omit<AuditEntry, "hash">);
      if (recomputed !== curr.hash) {
        broken.push(`Entry ${curr.id}: hash tampered`);
      }
    }

    return { valid: broken.length === 0, broken };
  }

  async query(options: AuditQueryOptions): Promise<AuditEntry[]> {
    return this.store.query(options);
  }
}

// ── Hash computation ──────────────────────────────────────────────────────

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

function computeHash(entry: Omit<AuditEntry, "hash"> & { hash?: string }): string {
  const { hash: _, ...data } = entry;
  return createHash("sha256").update(deterministicStringify(data)).digest("hex");
}

// ── Metadata sanitization (never store raw PII unless necessary) ──────────

function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    // Strip fields that commonly contain PII
    if (["password", "token", "secret", "credit_card", "ssn", "sin"].includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ── Store interface (implemented by apps/api Prisma adapter) ─────────────

export interface AuditStore {
  append(entry: AuditEntry): Promise<void>;
  getLastHash(tenantId: string): Promise<string>;
  getAll(tenantId: string): Promise<AuditEntry[]>;
  query(options: AuditQueryOptions): Promise<AuditEntry[]>;
}

export interface VerificationResult {
  valid: boolean;
  broken: string[];
}
