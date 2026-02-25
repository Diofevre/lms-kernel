import { Injectable, NestMiddleware, BadRequestException } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * TenantMiddleware — resolves tenant from subdomain on every request.
 *
 * Example:
 *   universite-montreal.lms.example.com → tenantSlug = "universite-montreal"
 *   api.lms.example.com               → rejected (no tenant)
 *
 * The resolved tenantId and tenantSlug are injected into request for downstream use.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly rootDomain = process.env["ROOT_DOMAIN"] ?? "lms.example.com";

  use(
    req: FastifyRequest & { tenantId?: string; tenantSlug?: string },
    _res: FastifyReply,
    next: () => void,
  ): void {
    const host = req.hostname ?? "";

    // Health check and internal routes bypass tenant resolution
    if (req.url.startsWith("/health") || req.url.startsWith("/internal")) {
      return next();
    }

    const tenantSlug = this.extractTenantSlug(host);
    if (!tenantSlug) {
      throw new BadRequestException("Unable to resolve tenant from hostname");
    }

    // TODO: Lookup tenantId from DB/cache by slug (Sprint 1)
    req.tenantSlug = tenantSlug;
    req.tenantId = `tenant:${tenantSlug}`; // Placeholder — replace with DB lookup

    next();
  }

  private extractTenantSlug(host: string): string | null {
    // Remove port if present
    const hostname = host.split(":")[0] ?? "";

    // localhost → use X-Tenant-Slug header for local dev
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "dev-tenant";
    }

    // Extract subdomain: "org.lms.example.com" → "org"
    if (hostname.endsWith(`.${this.rootDomain}`)) {
      const subdomain = hostname.slice(0, -(this.rootDomain.length + 1));
      if (subdomain && !subdomain.includes(".")) {
        return subdomain;
      }
    }

    return null;
  }
}
