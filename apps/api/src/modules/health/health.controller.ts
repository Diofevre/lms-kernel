import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Liveness probe" })
  liveness(): { status: string; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe" })
  async readiness(): Promise<{
    status: string;
    timestamp: string;
    services: Record<string, string>;
  }> {
    let dbStatus = "ok";
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1");
    } catch {
      dbStatus = "error";
    }

    const overallStatus = dbStatus === "ok" ? "ok" : "degraded";

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        // Redis and Keycloak checks can be added when those services are integrated
        redis: "unchecked",
        keycloak: "unchecked",
      },
    };
  }
}
