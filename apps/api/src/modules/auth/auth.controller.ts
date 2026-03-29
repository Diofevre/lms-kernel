import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@kern/iam";

interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
  tenantId?: string;
}

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("Keycloak")
  @ApiOperation({ summary: "Get current authenticated user info" })
  async getMe(@Req() req: AuthenticatedRequest) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.authService.findOrSyncUser(req.user.id, tenantId, {
      email: req.user.email,
      username: req.user.username,
      roles: req.user.roles,
    });
  }
}
