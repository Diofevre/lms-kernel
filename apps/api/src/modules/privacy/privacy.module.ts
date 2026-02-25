import { Module } from "@nestjs/common";
import { PrivacyController } from "./privacy.controller.js";

/** Loi 25 data subject rights module */
@Module({ controllers: [PrivacyController] })
export class PrivacyModule {}
