import type {
  KernelModule,
  KernelContext,
  KernelEvent,
  EventHandler,
  ModuleRegistryOptions,
  KernelLogger,
} from "./types.js";
import { EventBus } from "./event-bus.js";
import { randomUUID } from "crypto";

/**
 * ModuleRegistry — loads and orchestrates all KernelModules.
 *
 * Usage (in apps/api/src/main.ts):
 *   const registry = new ModuleRegistry({ modules: [...], env: "production" });
 *   await registry.initialize();
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, KernelModule>();
  private readonly bus = new EventBus();
  private readonly env: ModuleRegistryOptions["env"];

  constructor(options: ModuleRegistryOptions) {
    this.env = options.env;
    for (const mod of options.modules) {
      if (this.modules.has(mod.id)) {
        throw new Error(`[Kernel] Duplicate module ID: "${mod.id}"`);
      }
      this.modules.set(mod.id, mod);
    }
  }

  async initialize(): Promise<void> {
    const order = this.resolveLoadOrder();

    // onInit phase
    for (const id of order) {
      const mod = this.modules.get(id)!;
      const ctx = this.buildContext(mod.id);
      ctx.logger.info(`Initializing module "${mod.id}" v${mod.version}`);
      await mod.onInit?.(ctx);
    }

    // onReady phase
    for (const id of order) {
      const mod = this.modules.get(id)!;
      const ctx = this.buildContext(mod.id);
      await mod.onReady?.(ctx);
      ctx.logger.info(`Module "${mod.id}" ready`);
    }
  }

  async destroy(): Promise<void> {
    for (const mod of [...this.modules.values()].reverse()) {
      await mod.onDestroy?.();
    }
  }

  private buildContext(moduleId: string): KernelContext {
    const bus = this.bus;
    const env = this.env;
    const registry = this;

    return {
      env,
      logger: buildLogger(moduleId),
      emit: async <T>(event: KernelEvent<T>) => {
        await bus.emit(event.type, event.payload, moduleId, event.correlationId);
      },
      on: <T>(type: string, handler: EventHandler<T>) => bus.on(type, handler),
      getModule: <M extends KernelModule>(id: string) =>
        registry.modules.get(id) as M | undefined,
    };
  }

  /** Topological sort to respect dependency order */
  private resolveLoadOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const mod = this.modules.get(id);
      if (!mod) throw new Error(`[Kernel] Unknown module dependency: "${id}"`);
      for (const dep of mod.dependencies ?? []) {
        visit(dep);
      }
      order.push(id);
    };

    for (const id of this.modules.keys()) visit(id);
    return order;
  }
}

function buildLogger(moduleId: string): KernelLogger {
  const prefix = `[${moduleId}]`;
  return {
    info: (msg, meta) => console.log(`${prefix} INFO  ${msg}`, meta ?? ""),
    warn: (msg, meta) => console.warn(`${prefix} WARN  ${msg}`, meta ?? ""),
    error: (msg, err, meta) =>
      console.error(`${prefix} ERROR ${msg}`, err ?? "", meta ?? ""),
    debug: (msg, meta) => {
      if (process.env["NODE_ENV"] !== "production") {
        console.debug(`${prefix} DEBUG ${msg}`, meta ?? "");
      }
    },
  };
}
