import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard, Roles } from "../auth/auth.guard.js";
import { SupportService } from "./support.service.js";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@kern/iam";

interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
  tenantId?: string;
}

@ApiTags("support")
@Controller({ path: "support", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post("tickets")
  @ApiOperation({ summary: "Create a support ticket" })
  async create(@Req() req: AuthenticatedRequest, @Body() body: { subject: string; description: string; priority?: string }) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.supportService.create(body, req.user.id, tenantId);
  }

  @Get("tickets/mine")
  @ApiOperation({ summary: "List my support tickets" })
  async mine(@Req() req: AuthenticatedRequest) {
    return this.supportService.findByUser(req.user.id);
  }

  @Get("tickets")
  @Roles("tenant_admin", "super_admin")
  @ApiOperation({ summary: "List all support tickets (admin)" })
  async list(@Req() req: AuthenticatedRequest, @Query("status") status?: string, @Query("page") page?: string, @Query("limit") limit?: string) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.supportService.findByTenant(tenantId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch("tickets/:id/status")
  @Roles("tenant_admin", "super_admin")
  @ApiOperation({ summary: "Update ticket status (admin)" })
  async updateStatus(@Param("id", ParseUUIDPipe) id: string, @Body() body: { status: string }) {
    return this.supportService.updateStatus(id, body.status);
  }
}
