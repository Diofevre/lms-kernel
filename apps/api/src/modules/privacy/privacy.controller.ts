import { Controller, Get, Post, Delete, UseGuards, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard.js";

@ApiTags("privacy")
@Controller({ path: "privacy", version: "1" })
@UseGuards(AuthGuard)
@ApiBearerAuth("Keycloak")
export class PrivacyController {
  @Get("my-data")
  @ApiOperation({
    summary: "Export all my personal data (Loi 25 Art. 27 — right of access)",
    description: "Returns all personal data held about the authenticated user. " +
      "Response includes a JSON export. A PDF version can be requested via ?format=pdf.",
  })
  getMyData(): { message: string } {
    // TODO Sprint 1: query all tables with userId = current user, compile report
    return { message: "Data export endpoint — implementation in Sprint 1" };
  }

  @Post("correction-request")
  @ApiOperation({
    summary: "Request data correction (Loi 25 Art. 28 — right of correction)",
  })
  requestCorrection(@Body() _body: unknown): { message: string } {
    return { message: "Correction request registered — implementation in Sprint 1" };
  }

  @Delete("my-data")
  @ApiOperation({
    summary: "Request data deletion (Loi 25 — right to be forgotten)",
    description: "Initiates a deletion workflow. Data is deleted within 30 days per Loi 25 requirements.",
  })
  requestDeletion(): { message: string; deadline: string } {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    return {
      message: "Deletion request registered. You will be notified upon completion.",
      deadline: deadline.toISOString(),
    };
  }
}
