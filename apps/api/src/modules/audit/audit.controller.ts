import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from "@nestjs/swagger";
import { AuthGuard, Roles } from "../auth/auth.guard.js";

@ApiTags("audit")
@Controller({ path: "audit", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class AuditController {
  @Get("logs")
  @Roles("auditor", "tenant_admin", "privacy_officer")
  @ApiOperation({
    summary: "Query immutable audit log",
    description:
      "Returns paginated audit entries for the current tenant. " +
      "The log is append-only and tamper-evident (SHA-256 hash chain). " +
      "Access requires auditor, tenant_admin, or privacy_officer role.",
  })
  @ApiQuery({ name: "from", required: false, type: String, example: "2024-01-01T00:00:00Z" })
  @ApiQuery({ name: "to", required: false, type: String })
  @ApiQuery({ name: "action", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 50 })
  queryLogs(
    @Query("from") _from?: string,
    @Query("to") _to?: string,
    @Query("action") _action?: string,
    @Query("limit") _limit?: number,
  ): { message: string } {
    // TODO Sprint 1: implement with AuditLog from @lms/audit
    return { message: "Audit log query — implementation in Sprint 1" };
  }

  @Get("verify")
  @Roles("auditor", "tenant_admin")
  @ApiOperation({
    summary: "Verify audit log chain integrity",
    description: "Recomputes SHA-256 hash chain to detect any tampering.",
  })
  verifyChain(): { message: string } {
    return { message: "Chain verification — implementation in Sprint 1" };
  }
}
