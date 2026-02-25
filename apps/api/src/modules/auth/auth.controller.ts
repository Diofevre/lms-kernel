import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "./auth.guard.js";

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth("Keycloak")
  @ApiOperation({ summary: "Get current authenticated user info" })
  getMe(): { message: string } {
    // Actual user info comes from request.user (set by AuthGuard)
    return { message: "Authenticated — user info in request context" };
  }
}
