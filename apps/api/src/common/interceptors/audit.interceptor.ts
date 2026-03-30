import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
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
 * Delegates to AuditLogService (not PrismaService directly) to avoid DI scope issues.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Optional() @Inject(AuditLogService) private readonly auditLog?: AuditLogService,
  ) {}

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
      const tenantId = request.tenantId ?? request.user?.tenantId ?? "unknown";
      const userId = request.user?.id ?? "anonymous";
      const path = request.url.split("?")[0] ?? "/";
      const action = `api.${request.method.toLowerCase()}.${path.replace(/\//g, ".").replace(/^\./, "")}`;

      if (!this.auditLog) {
        if (process.env["NODE_ENV"] === "development") {
          console.log("[AUDIT]", JSON.stringify({ action, userId, tenantId, outcome, durationMs }));
        }
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
      console.error("[AUDIT ERROR]", err);
    }
  }
}
