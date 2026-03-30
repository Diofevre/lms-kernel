import { describe, it, expect } from "vitest";
import { AuditLog } from "../audit-log.js";
import type { AuditStore } from "../audit-log.js";
import type { AuditEntry, AuditQueryOptions } from "../types.js";

function createMockStore(): AuditStore & { entries: AuditEntry[] } {
  const entries: AuditEntry[] = [];
  return {
    entries,
    async append(entry: AuditEntry) {
      entries.push(entry);
    },
    async getLastHash(tenantId: string) {
      const tenantEntries = entries.filter((e) => e.tenantId === tenantId);
      return tenantEntries.length > 0 ? tenantEntries[tenantEntries.length - 1]!.hash : "";
    },
    async getAll(tenantId: string) {
      return entries.filter((e) => e.tenantId === tenantId);
    },
    async query(_options: AuditQueryOptions) {
      return entries;
    },
  };
}

const testActor = { id: "user-1", type: "user" as const };
const testResource = { type: "document", id: "doc-1" };

describe("AuditLog", () => {
  it("should create an entry with a valid SHA-256 hash", async () => {
    const store = createMockStore();
    const log = new AuditLog(store);
    const entry = await log.log("auth.login", testActor, testResource, "tenant-1");
    expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(entry.previousHash).toBe("");
    expect(store.entries).toHaveLength(1);
  });

  it("should chain hashes (entry N references hash of N-1)", async () => {
    const store = createMockStore();
    const log = new AuditLog(store);
    const e1 = await log.log("auth.login", testActor, testResource, "tenant-1");
    const e2 = await log.log("auth.logout", testActor, testResource, "tenant-1");
    expect(e2.previousHash).toBe(e1.hash);
    expect(e2.hash).not.toBe(e1.hash);
  });

  it("should verify a valid chain", async () => {
    const store = createMockStore();
    const log = new AuditLog(store);
    await log.log("auth.login", testActor, testResource, "tenant-1");
    await log.log("auth.logout", testActor, testResource, "tenant-1");
    await log.log("admin.user_created", testActor, testResource, "tenant-1");
    const result = await log.verifyChain("tenant-1");
    expect(result.valid).toBe(true);
    expect(result.broken).toHaveLength(0);
  });

  it("should detect tampering (modified hash)", async () => {
    const store = createMockStore();
    const log = new AuditLog(store);
    await log.log("auth.login", testActor, testResource, "tenant-1");
    await log.log("auth.logout", testActor, testResource, "tenant-1");
    store.entries[0]!.hash = "tampered-hash-value";
    const result = await log.verifyChain("tenant-1");
    expect(result.valid).toBe(false);
    expect(result.broken.length).toBeGreaterThan(0);
  });

  it("should sanitize sensitive metadata fields", async () => {
    const store = createMockStore();
    const log = new AuditLog(store);
    const entry = await log.log("auth.login", testActor, testResource, "tenant-1", {
      username: "test-user",
      password: "secret123",
      token: "jwt-token-value",
      credit_card: "4111111111111111",
      normalField: "visible",
    });
    expect(entry.metadata?.["username"]).toBe("test-user");
    expect(entry.metadata?.["password"]).toBe("[REDACTED]");
    expect(entry.metadata?.["token"]).toBe("[REDACTED]");
    expect(entry.metadata?.["credit_card"]).toBe("[REDACTED]");
    expect(entry.metadata?.["normalField"]).toBe("visible");
  });

  it("should isolate tenants (different chains)", async () => {
    const store = createMockStore();
    const log = new AuditLog(store);
    const a1 = await log.log("auth.login", testActor, testResource, "tenant-a");
    const b1 = await log.log("auth.login", testActor, testResource, "tenant-b");
    // Each tenant starts with empty previousHash
    expect(a1.previousHash).toBe("");
    expect(b1.previousHash).toBe("");
    // Verify each chain independently
    expect((await log.verifyChain("tenant-a")).valid).toBe(true);
    expect((await log.verifyChain("tenant-b")).valid).toBe(true);
  });

  it("should handle concurrent writes safely", async () => {
    const store = createMockStore();
    const log = new AuditLog(store);
    // Fire 5 writes concurrently
    await Promise.all([
      log.log("auth.login", testActor, testResource, "tenant-1"),
      log.log("auth.logout", testActor, testResource, "tenant-1"),
      log.log("admin.user_created", testActor, testResource, "tenant-1"),
      log.log("admin.role_assigned", testActor, testResource, "tenant-1"),
      log.log("security.suspicious_activity", testActor, testResource, "tenant-1"),
    ]);
    expect(store.entries).toHaveLength(5);
    // Chain should still be valid
    const result = await log.verifyChain("tenant-1");
    expect(result.valid).toBe(true);
  });
});
