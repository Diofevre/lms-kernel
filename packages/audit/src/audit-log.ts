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
  constructor(private readonly store: AuditStore) {}

  async log(
    action: AuditAction,
    actor: AuditActor,
    resource: AuditResource,
    tenantId: string,
    metadata?: Record<string, unknown>,
  ): Promise<AuditEntry> {
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

      const recomputed = computeHash({ ...curr, hash: "" });
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

function computeHash(entry: Omit<AuditEntry, "hash"> & { hash?: string }): string {
  const { hash: _, ...data } = entry;
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
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
