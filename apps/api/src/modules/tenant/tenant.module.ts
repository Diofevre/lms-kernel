import { Module } from "@nestjs/common";
import { TenantController } from "./tenant.controller.js";

@Module({ controllers: [TenantController] })
export class TenantModule {}
