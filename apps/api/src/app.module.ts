import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { TenantMiddleware } from "./common/middleware/tenant.middleware.js";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { TenantModule } from "./modules/tenant/tenant.module.js";
import { UserModule } from "./modules/user/user.module.js";
import { PrivacyModule } from "./modules/privacy/privacy.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";

@Module({
  imports: [
    // ── Database ──────────────────────────────────────────────────────
    PrismaModule,

    // ── Rate limiting (anti-DDoS, anti-brute-force) ───────────────────
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 10 },    // 10 req/sec
      { name: "medium", ttl: 60000, limit: 200 },  // 200 req/min
      { name: "long", ttl: 3600000, limit: 1000 }, // 1000 req/hour
    ]),

    // ── Kernel modules ─────────────────────────────────────────────────
    HealthModule,
    AuthModule,
    TenantModule,
    UserModule,
    PrivacyModule,
    AuditModule,

    // ── LMS modules (loaded dynamically based on tenant config) ────────
    // Loaded via ModuleRegistry — see docs/MODULE_CONTRACT.md
  ],
  providers: [
    // Rate limiting guard (global)
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Audit every request (global interceptor)
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },

    // Global error handler
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Resolve tenant from subdomain on every request
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
