import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Liveness probe" })
  liveness(): { status: string; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe" })
  readiness(): { status: string; services: Record<string, string> } {
    // TODO: check DB + Redis connectivity in Sprint 1
    return {
      status: "ok",
      services: { database: "ok", redis: "ok", keycloak: "ok" },
    };
  }
}
