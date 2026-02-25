import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // ── Security headers ──────────────────────────────────────────────────
  await app.register(helmet as never);

  // ── CORS — restrict to known origins ─────────────────────────────────
  app.enableCors({
    origin: process.env["ALLOWED_ORIGINS"]?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  // ── Global validation pipe — strict, no unknowns ─────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ── API versioning ────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // ── Swagger / OpenAPI (auto-generated — institutional documentation) ──
  if (process.env["NODE_ENV"] !== "production") {
    const config = new DocumentBuilder()
      .setTitle("LMS Kernel API")
      .setDescription(
        "LMS Kernel — REST API. Auto-generated from NestJS decorators.\n\n" +
        "Compliance: Loi 25 (Québec) | WCAG 2.1 AA | LPRPDE",
      )
      .setVersion("1.0")
      .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "Keycloak")
      .addTag("auth", "Authentication endpoints")
      .addTag("tenants", "Multi-tenant management")
      .addTag("privacy", "Loi 25 — Data subject rights")
      .addTag("audit", "Immutable audit log")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = parseInt(process.env["PORT"] ?? "4000", 10);
  await app.listen(port, "0.0.0.0");
  console.log(`LMS Kernel API running on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap().catch(console.error);
