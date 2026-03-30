import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard, Roles } from "../auth/auth.guard.js";
import { PrivacyService } from "./privacy.service.js";
import { CorrectionRequestDto, ProcessRequestDto } from "./privacy.dto.js";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@kern/iam";

interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
  tenantId?: string;
}

@ApiTags("privacy")
@Controller({ path: "privacy", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get("my-data")
  @ApiOperation({
    summary: "Export all my personal data (Loi 25 Art. 27 -- right of access)",
    description:
      "Returns all personal data held about the authenticated user. " +
      "Response includes a JSON export. A PDF version can be requested via ?format=pdf.",
  })
  async getMyData(@Req() req: AuthenticatedRequest) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.privacyService.getUserData(req.user.id, tenantId);
  }

  @Post("correction-request")
  @ApiOperation({
    summary: "Request data correction (Loi 25 Art. 28 -- right of correction)",
  })
  async requestCorrection(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CorrectionRequestDto,
  ) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    const request = await this.privacyService.createRequest(
      req.user.id,
      tenantId,
      "correction",
    );
    return {
      message: "Correction request registered. It will be processed within 30 days per Loi 25.",
      request,
    };
  }

  @Delete("my-data")
  @ApiOperation({
    summary: "Request data deletion (Loi 25 -- right to be forgotten)",
    description:
      "Initiates a deletion workflow. Data is deleted within 30 days per Loi 25 requirements.",
  })
  async requestDeletion(@Req() req: AuthenticatedRequest) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    const request = await this.privacyService.createRequest(
      req.user.id,
      tenantId,
      "deletion",
    );
    return {
      message: "Deletion request registered. You will be notified upon completion.",
      deadline: request.deadline.toISOString(),
      request,
    };
  }

  @Get("requests")
  @Roles("super_admin", "privacy_officer", "tenant_admin")
  @ApiOperation({
    summary: "List all data subject requests for tenant (privacy_officer)",
  })
  async listRequests(@Req() req: AuthenticatedRequest) {
    const tenantId = req.tenantId ?? req.user.tenantId;
    return this.privacyService.getRequests(tenantId);
  }

  @Patch("requests/:id")
  @Roles("super_admin", "privacy_officer", "tenant_admin")
  @ApiOperation({
    summary: "Process a data subject request (approve/deny)",
  })
  async processRequest(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ProcessRequestDto,
  ) {
    return this.privacyService.processRequest(id, dto.action, dto.reason);
  }
}
