import type { KernelEvent, EventHandler, Unsubscribe } from "./types.js";
import { randomUUID } from "crypto";

/**
 * In-process event bus.
 * Modules subscribe to event types and receive all matching events.
 * For production distributed setups, replace with a Redis Streams adapter.
 */
export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  on<T = unknown>(eventType: string, handler: EventHandler<T>): Unsubscribe {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler);
    };
  }

  async emit<T = unknown>(
    type: string,
    payload: T,
    source: string,
    correlationId?: string,
  ): Promise<void> {
    const event: KernelEvent<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      source,
      correlationId: correlationId ?? randomUUID(),
    };

    const handlers = this.handlers.get(type);
    if (!handlers || handlers.size === 0) return;

    await Promise.allSettled([...handlers].map((h) => h(event)));
  }

  /** Remove all handlers — used in tests */
  clear(): void {
    this.handlers.clear();
  }
}
