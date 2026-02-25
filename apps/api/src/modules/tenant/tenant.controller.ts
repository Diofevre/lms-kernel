import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard, Roles } from "../auth/auth.guard.js";

@ApiTags("tenants")
@Controller({ path: "tenants", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class TenantController {
  @Get("current")
  @ApiOperation({ summary: "Get current tenant info (resolved from subdomain)" })
  getCurrent(): { message: string } {
    return { message: "Tenant info — implementation in Sprint 1" };
  }

  @Get()
  @Roles("super_admin")
  @ApiOperation({ summary: "List all tenants (super_admin only)" })
  listAll(): { message: string } {
    return { message: "Tenant list — super_admin only — implementation in Sprint 1" };
  }
}
