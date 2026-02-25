/**
 * @lms/core — Kernel types
 *
 * Every module in the LMS kernel MUST implement KernelModule.
 * This is the single source of truth for the module contract.
 */

// ── Module lifecycle ──────────────────────────────────────────────────────

export interface KernelModule {
  /** Unique identifier — e.g. "auth", "courses-video", "proctoring" */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** SemVer string */
  readonly version: string;

  /** Other module IDs this module depends on */
  readonly dependencies?: string[];

  /** Called once when the kernel boots, before routes are registered */
  onInit?(kernel: KernelContext): Promise<void>;

  /** Called after all modules are initialized */
  onReady?(kernel: KernelContext): Promise<void>;

  /** Called on graceful shutdown */
  onDestroy?(): Promise<void>;
}

// ── Kernel context (injected into each module) ───────────────────────────

export interface KernelContext {
  /** Emit an event to all subscribers */
  emit<T = unknown>(event: KernelEvent<T>): Promise<void>;

  /** Subscribe to an event type */
  on<T = unknown>(eventType: string, handler: EventHandler<T>): Unsubscribe;

  /** Get a registered module by ID */
  getModule<M extends KernelModule>(id: string): M | undefined;

  /** Logger instance scoped to the module */
  logger: KernelLogger;

  /** Current environment */
  env: "development" | "staging" | "production";

  /** Tenant context (populated per-request in multi-tenant mode) */
  tenant?: TenantContext;
}

// ── Events ────────────────────────────────────────────────────────────────

export interface KernelEvent<T = unknown> {
  /** Event type — e.g. "user.created", "course.published" */
  type: string;

  /** Event payload */
  payload: T;

  /** ISO timestamp */
  timestamp: string;

  /** Module that emitted the event */
  source: string;

  /** Correlation ID for tracing */
  correlationId: string;
}

export type EventHandler<T = unknown> = (event: KernelEvent<T>) => Promise<void>;
export type Unsubscribe = () => void;

// ── Multi-tenant ──────────────────────────────────────────────────────────

export interface TenantContext {
  /** Unique tenant ID (UUID) */
  id: string;

  /** Slug used in subdomains — e.g. "universite-montreal" */
  slug: string;

  /** Display name */
  name: string;

  /** Active modules for this tenant */
  enabledModules: string[];

  /** Tenant-specific config overrides */
  config: Record<string, unknown>;
}

// ── Logging ───────────────────────────────────────────────────────────────

export interface KernelLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// ── Module registry ───────────────────────────────────────────────────────

export interface ModuleRegistryOptions {
  /** Modules to load at startup */
  modules: KernelModule[];

  /** Environment */
  env: "development" | "staging" | "production";
}
