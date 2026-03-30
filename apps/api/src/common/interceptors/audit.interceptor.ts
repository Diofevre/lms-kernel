import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
  Logger,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { createHash } from "crypto";
import type { FastifyRequest } from "fastify";
import { AuditLogService } from "../../modules/audit/audit-log.service.js";

interface AuditableRequest extends FastifyRequest {
  tenantId?: string;
  user?: { id: string; tenantId?: string };
}

/**
 * AuditInterceptor — logs every mutating API call to the immutable audit log.
 *
 * NO WORKAROUNDS:
 * - If AuditLogService is not available, log a WARNING (not silent)
 * - Uses NestJS Logger, not console.log
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    @Optional() @Inject(AuditLogService) private readonly auditLog?: AuditLogService,
  ) {
    if (!this.auditLog) {
      this.logger.warn("AuditLogService not injected — audit entries will NOT be persisted to DB");
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const method = request.method;

    const shouldAudit = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    if (!shouldAudit) return next.handle();

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.saveAuditEntry(request, "success", Date.now() - startTime);
        },
        error: (err: unknown) => {
          void this.saveAuditEntry(request, "error", Date.now() - startTime, err);
        },
      }),
    );
  }

  private async saveAuditEntry(
    request: AuditableRequest,
    outcome: "success" | "error",
    durationMs: number,
    error?: unknown,
  ): Promise<void> {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id ?? "anonymous";
      const path = request.url.split("?")[0] ?? "/";
      const action = `api.${request.method.toLowerCase()}.${path.replace(/\//g, ".").replace(/^\./, "")}`;

      if (!this.auditLog) {
        // Not silently swallowed — warning was logged at startup
        return;
      }

      if (!tenantId) {
        this.logger.warn(`Audit skipped: no tenantId resolved for ${action}`);
        return;
      }

      await this.auditLog.saveEntry({
        tenantId,
        action,
        actorId: userId,
        actorIpHash: request.ip ? createHash("sha256").update(request.ip).digest("hex") : null,
        resourceId: path,
        metadata: {
          method: request.method,
          outcome,
          durationMs,
          ...(error ? { error: String(error) } : {}),
        },
      });
    } catch (err) {
      this.logger.error(`Audit write failed: ${String(err)}`);
    }
  }
}
