import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard, Roles } from "../auth/auth.guard.js";
import { UserService } from "./user.service.js";
import { CreateUserDto, UpdateRolesDto, ToggleUserDto, UserQueryDto } from "./user.dto.js";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@kern/iam";

interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
  tenantId?: string;
}

@ApiTags("users")
@Controller({ path: "users", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles("tenant_admin", "super_admin")
  @ApiOperation({ summary: "List users for current tenant (tenant_admin)" })
  async listUsers(@Req() req: AuthenticatedRequest, @Query() query: UserQueryDto) {
    let tenantId = req.tenantId ?? req.user.tenantId;

    // super_admin with no tenant resolved: show all users (or resolve from slug)
    if ((!tenantId || tenantId === "") && req.user.roles.includes("super_admin")) {
      tenantId = ""; // Empty = show all
    }

    const options: { search?: string; role?: string; page?: number; limit?: number } = {};
    if (query.search !== undefined) options.search = query.search;
    if (query.role !== undefined) options.role = query.role;
    if (query.page !== undefined) options.page = query.page;
    if (query.limit !== undefined) options.limit = query.limit;
    return this.userService.findByTenant(tenantId, options);
  }

  @Get(":id")
  @Roles("tenant_admin", "super_admin")
  @ApiOperation({ summary: "Get user details (tenant_admin)" })
  async getUser(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.userService.findById(id, tenantId);
  }

  @Post()
  @Roles("tenant_admin", "super_admin")
  @ApiOperation({ summary: "Create / invite a user (tenant_admin)" })
  async createUser(@Req() req: AuthenticatedRequest, @Body() dto: CreateUserDto) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.userService.create(dto, tenantId);
  }

  @Patch(":id/roles")
  @Roles("tenant_admin", "super_admin")
  @ApiOperation({ summary: "Update user roles (tenant_admin)" })
  async updateRoles(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolesDto,
  ) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.userService.updateRoles(id, tenantId, dto.roles);
  }

  @Patch(":id/toggle")
  @Roles("tenant_admin", "super_admin")
  @ApiOperation({ summary: "Activate or deactivate a user (tenant_admin)" })
  async toggleUser(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ToggleUserDto,
  ) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.userService.toggleActive(id, tenantId, dto.isActive);
  }
}
