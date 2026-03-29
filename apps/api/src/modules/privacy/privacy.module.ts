import { Module } from "@nestjs/common";
import { PrivacyController } from "./privacy.controller.js";
import { PrivacyService } from "./privacy.service.js";

/** Loi 25 data subject rights module */
@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
