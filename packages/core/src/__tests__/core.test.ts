import { describe, it, expect, vi } from "vitest";
import { EventBus } from "../event-bus.js";
import type { KernelEvent } from "../types.js";

describe("EventBus", () => {
  it("should emit events to subscribers", async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("user.created", handler);
    await bus.emit("user.created", { id: "1" }, "test");
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0]).toMatchObject({
      type: "user.created",
      payload: { id: "1" },
      source: "test",
    });
  });

  it("should not call handlers for other event types", async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("user.created", handler);
    await bus.emit("user.deleted", { id: "1" }, "test");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should support multiple handlers for the same event", async () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("user.created", h1);
    bus.on("user.created", h2);
    await bus.emit("user.created", { id: "1" }, "test");
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("should unsubscribe when calling the returned function", async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsubscribe = bus.on("user.created", handler);
    unsubscribe();
    await bus.emit("user.created", { id: "1" }, "test");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should include timestamp and correlationId in events", async () => {
    const bus = new EventBus();
    let received: KernelEvent | undefined;
    bus.on("test", async (event) => { received = event; });
    await bus.emit("test", {}, "source");
    expect(received).toBeDefined();
    expect(received!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(received!.correlationId).toMatch(/^[a-f0-9-]{36}$/);
  });

  it("should use provided correlationId", async () => {
    const bus = new EventBus();
    let received: KernelEvent | undefined;
    bus.on("test", async (event) => { received = event; });
    await bus.emit("test", {}, "source", "custom-correlation-id");
    expect(received!.correlationId).toBe("custom-correlation-id");
  });

  it("should not throw if no handlers registered", async () => {
    const bus = new EventBus();
    await expect(bus.emit("no.handlers", {}, "test")).resolves.toBeUndefined();
  });

  it("should handle errors in handlers gracefully (Promise.allSettled)", async () => {
    const bus = new EventBus();
    const goodHandler = vi.fn();
    bus.on("test", async () => { throw new Error("boom"); });
    bus.on("test", goodHandler);
    await bus.emit("test", {}, "source");
    // Good handler should still be called despite the error in the other
    expect(goodHandler).toHaveBeenCalledOnce();
  });

  it("should clear all handlers", async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("test", handler);
    bus.clear();
    await bus.emit("test", {}, "source");
    expect(handler).not.toHaveBeenCalled();
  });
});
