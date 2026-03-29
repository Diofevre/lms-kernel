import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard, Roles } from "../auth/auth.guard.js";
import { AuditService } from "./audit.service.js";
import { AuditQueryDto } from "./audit.dto.js";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@kern/iam";

interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
  tenantId?: string;
}

@ApiTags("audit")
@Controller({ path: "audit", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("logs")
  @Roles("auditor", "tenant_admin", "privacy_officer")
  @ApiOperation({
    summary: "Query immutable audit log",
    description:
      "Returns paginated audit entries for the current tenant. " +
      "The log is append-only and tamper-evident (SHA-256 hash chain). " +
      "Access requires auditor, tenant_admin, or privacy_officer role.",
  })
  async queryLogs(
    @Req() req: AuthenticatedRequest,
    @Query() query: AuditQueryDto,
  ) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    const options: { from?: string; to?: string; action?: string; limit?: number } = {};
    if (query.from !== undefined) options.from = query.from;
    if (query.to !== undefined) options.to = query.to;
    if (query.action !== undefined) options.action = query.action;
    if (query.limit !== undefined) options.limit = query.limit;
    return this.auditService.queryLogs(tenantId, options);
  }

  @Get("verify")
  @Roles("auditor", "tenant_admin")
  @ApiOperation({
    summary: "Verify audit log chain integrity",
    description: "Recomputes SHA-256 hash chain to detect any tampering.",
  })
  async verifyChain(@Req() req: AuthenticatedRequest) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.auditService.verifyChain(tenantId);
  }
}
