import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard, Roles } from "../auth/auth.guard.js";
import { TenantService } from "./tenant.service.js";
import { CreateTenantDto, UpdateTenantDto, ToggleTenantDto } from "./tenant.dto.js";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@kern/iam";

interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
  tenantId?: string;
  tenantSlug?: string;
}

@ApiTags("tenants")
@Controller({ path: "tenants", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @Roles("super_admin")
  @ApiOperation({ summary: "List all tenants (super_admin only)" })
  async listAll() {
    return this.tenantService.findAll();
  }

  @Get("current")
  @ApiOperation({ summary: "Get current tenant info (resolved from subdomain)" })
  async getCurrent(@Req() req: AuthenticatedRequest) {
    const slug = req.tenantSlug ?? req.user.tenantSlug;
    return this.tenantService.findBySlug(slug);
  }

  @Post()
  @Roles("super_admin")
  @ApiOperation({ summary: "Create a new tenant (super_admin only)" })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Patch(":id")
  @Roles("super_admin")
  @ApiOperation({ summary: "Update tenant settings (super_admin only)" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantService.update(id, dto);
  }

  @Patch(":id/toggle")
  @Roles("super_admin")
  @ApiOperation({ summary: "Activate or deactivate a tenant (super_admin only)" })
  async toggle(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ToggleTenantDto,
  ) {
    return this.tenantService.toggleActive(id, dto.isActive);
  }
}
