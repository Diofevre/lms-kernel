import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import type { FastifyRequest } from "fastify";

/**
 * AuditInterceptor — logs every mutating API call to the immutable audit log.
 * Applied globally in AppModule.
 *
 * Read operations (GET) are NOT audited by default (high volume, low risk).
 * Override with @Audit() decorator on specific GET routes if needed.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = request.method;

    // Only audit mutating operations by default
    const shouldAudit = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    if (!shouldAudit) return next.handle();

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          // Successful mutation — log to audit
          // AuditLog service injected via DI in production implementation
          void this.logAuditEntry(request, "success", Date.now() - startTime);
        },
        error: (err: unknown) => {
          // Failed mutation — also logged
          void this.logAuditEntry(request, "error", Date.now() - startTime, err);
        },
      }),
    );
  }

  private async logAuditEntry(
    request: FastifyRequest,
    outcome: "success" | "error",
    durationMs: number,
    error?: unknown,
  ): Promise<void> {
    // TODO: inject AuditLog from @lms/audit via NestJS DI
    // This is a placeholder — full implementation in Sprint 1
    const logEntry = {
      method: request.method,
      path: request.url,
      outcome,
      durationMs,
      tenantId: (request as FastifyRequest & { tenantId?: string }).tenantId,
      userId: (request as FastifyRequest & { user?: { id: string } }).user?.id,
      error: outcome === "error" ? String(error) : undefined,
    };
    if (process.env["NODE_ENV"] === "development") {
      console.log("[AUDIT]", JSON.stringify(logEntry));
    }
  }
}
