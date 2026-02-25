import { Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard.js";
import { AuthController } from "./auth.controller.js";

@Module({
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
