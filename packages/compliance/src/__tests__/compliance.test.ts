import { describe, it, expect, vi } from "vitest";
import { ConsentManager } from "../consent-manager.js";
import { DataSubjectService } from "../data-subject-service.js";
import type { ConsentDb } from "../consent-manager.js";
import type { DataSubjectDb } from "../data-subject-service.js";

// ── ConsentManager Tests ─────────────────────────────────────────────────

function createMockConsentDb(): ConsentDb {
  const records: Array<Record<string, unknown>> = [];
  let idCounter = 0;

  return {
    consent: {
      async create(args) {
        const record = { id: `consent-${++idCounter}`, ...args.data, givenAt: new Date(), expiresAt: null, withdrawnAt: null };
        records.push(record);
        return record as ReturnType<ConsentDb["consent"]["create"]> extends Promise<infer T> ? T : never;
      },
      async findMany(args) {
        return records.filter((r) => {
          const w = args.where;
          return Object.entries(w).every(([k, v]) => {
            if (v === null) return r[k] === null;
            return r[k] === v;
          });
        }) as Awaited<ReturnType<ConsentDb["consent"]["findMany"]>>;
      },
      async findFirst(args) {
        const results = await this.findMany(args);
        return results[0] ?? null;
      },
      async update(args) {
        const record = records.find((r) => r["id"] === (args.where as { id: string }).id);
        if (!record) throw new Error("Not found");
        Object.assign(record, args.data);
        return record as Awaited<ReturnType<ConsentDb["consent"]["update"]>>;
      },
    },
  };
}

describe("ConsentManager", () => {
  it("should grant consent and return a record", async () => {
    const db = createMockConsentDb();
    const manager = new ConsentManager(db);
    const result = await manager.grantConsent({
      tenantId: "t1", userId: "u1", categories: ["contact", "identity"],
      purpose: "Account creation", method: "explicit_checkbox", ipHash: "abc123",
    });
    expect(result.id).toBeDefined();
    expect(result.categories).toEqual(["contact", "identity"]);
  });

  it("should withdraw consent", async () => {
    const db = createMockConsentDb();
    const manager = new ConsentManager(db);
    const consent = await manager.grantConsent({
      tenantId: "t1", userId: "u1", categories: ["contact"],
      purpose: "Newsletter", method: "explicit_checkbox", ipHash: "abc",
    });
    const withdrawn = await manager.withdrawConsent(consent.id);
    expect(withdrawn.withdrawnAt).toBeDefined();
  });

  it("should list active consents (not withdrawn)", async () => {
    const db = createMockConsentDb();
    const manager = new ConsentManager(db);
    await manager.grantConsent({ tenantId: "t1", userId: "u1", categories: ["contact"], purpose: "P1", method: "explicit_checkbox", ipHash: "a" });
    await manager.grantConsent({ tenantId: "t1", userId: "u1", categories: ["identity"], purpose: "P2", method: "explicit_checkbox", ipHash: "b" });

    const active = await manager.getActiveConsents("u1", "t1");
    expect(active.length).toBe(2);
  });
});

// ── DataSubjectService Tests ─────────────────────────────────────────────

function createMockRequestDb(): DataSubjectDb {
  const records: Array<Record<string, unknown>> = [];
  let idCounter = 0;

  return {
    request: {
      async create(args) {
        const record = { id: `req-${++idCounter}`, ...args.data, status: "pending", requestedAt: new Date(), completedAt: null, denialReason: null };
        records.push(record);
        return record as Awaited<ReturnType<DataSubjectDb["request"]["create"]>>;
      },
      async findMany(args) {
        return records.filter((r) => {
          const w = args.where;
          return Object.entries(w).every(([k, v]) => {
            if (v && typeof v === "object" && "lt" in v) return (r[k] as Date) < (v as { lt: Date }).lt;
            return r[k] === v;
          });
        }) as Awaited<ReturnType<DataSubjectDb["request"]["findMany"]>>;
      },
      async update(args) {
        const record = records.find((r) => r["id"] === (args.where as { id: string }).id);
        if (!record) throw new Error("Not found");
        Object.assign(record, args.data);
        return record as Awaited<ReturnType<DataSubjectDb["request"]["update"]>>;
      },
    },
  };
}

describe("DataSubjectService", () => {
  it("should create an access request with 30-day deadline", async () => {
    const db = createMockRequestDb();
    const service = new DataSubjectService(db);
    const req = await service.createAccessRequest("u1", "t1");
    expect(req.type).toBe("access");
    expect(req.status).toBe("pending");

    const deadline = new Date(req.deadline as unknown as string);
    const now = new Date();
    const diffDays = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it("should create deletion, correction, and portability requests", async () => {
    const db = createMockRequestDb();
    const service = new DataSubjectService(db);

    const del = await service.createDeletionRequest("u1", "t1");
    expect(del.type).toBe("deletion");

    const cor = await service.createCorrectionRequest("u1", "t1");
    expect(cor.type).toBe("correction");

    const port = await service.createPortabilityRequest("u1", "t1");
    expect(port.type).toBe("portability");
  });

  it("should process a request (complete)", async () => {
    const db = createMockRequestDb();
    const service = new DataSubjectService(db);
    const req = await service.createAccessRequest("u1", "t1");
    const processed = await service.processRequest(req.id, "complete");
    expect(processed.status).toBe("completed");
    expect(processed.completedAt).toBeDefined();
  });

  it("should deny a request with reason", async () => {
    const db = createMockRequestDb();
    const service = new DataSubjectService(db);
    const req = await service.createAccessRequest("u1", "t1");
    const denied = await service.processRequest(req.id, "deny", "Insufficient identity verification");
    expect(denied.status).toBe("denied");
    expect(denied.denialReason).toBe("Insufficient identity verification");
  });

  it("should require reason when denying", async () => {
    const db = createMockRequestDb();
    const service = new DataSubjectService(db);
    const req = await service.createAccessRequest("u1", "t1");
    await expect(service.processRequest(req.id, "deny")).rejects.toThrow("Denial reason is required");
  });
});
