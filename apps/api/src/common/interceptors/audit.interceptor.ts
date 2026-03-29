import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { createHash, randomUUID } from "crypto";
import type { FastifyRequest } from "fastify";
import { PrismaService } from "../../prisma/prisma.service.js";

interface AuditableRequest extends FastifyRequest {
  tenantId?: string;
  user?: { id: string; tenantId?: string };
}

/**
 * AuditInterceptor — logs every mutating API call to the immutable audit log.
 * Writes directly to the audit_logs table with SHA-256 hash chaining.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
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
      const action = `api.${request.method.toLowerCase()}.${request.url.split("?")[0]?.replace(/\//g, ".").replace(/^\./, "")}`;

      if (!this.prisma) {
        if (process.env["NODE_ENV"] === "development") {
          console.log("[AUDIT]", JSON.stringify({ action, userId, tenantId, outcome, durationMs }));
        }
        return;
      }

      // Get last hash for chain
      const last = await this.prisma.auditLog.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: { hash: true },
      });
      const previousHash = last?.hash ?? "";

      const entry = {
        id: randomUUID(),
        tenantId,
        action,
        actorId: userId,
        actorType: "user",
        actorIpHash: request.ip ? createHash("sha256").update(request.ip).digest("hex") : null,
        resourceType: "api",
        resourceId: request.url.split("?")[0] ?? "/",
        metadata: {
          method: request.method,
          outcome,
          durationMs,
          ...(error ? { error: String(error) } : {}),
        },
        previousHash,
        dataRegion: process.env["DATA_REGION"] ?? "ca-central-1",
      };

      // Deterministic hash (sorted keys)
      const hashInput = JSON.stringify(entry, Object.keys(entry).sort());
      const hash = createHash("sha256").update(hashInput).digest("hex");

      await this.prisma.auditLog.create({
        data: { ...entry, hash },
      });
    } catch (err) {
      // Audit failure must never crash the request
      console.error("[AUDIT ERROR]", err);
    }
  }
}
