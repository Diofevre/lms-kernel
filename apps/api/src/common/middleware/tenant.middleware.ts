import { Injectable, NestMiddleware, BadRequestException } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaService } from "../../prisma/prisma.service.js";

/**
 * In-memory tenant cache entry with TTL.
 */
interface TenantCacheEntry {
  tenantId: string;
  resolvedAt: number;
}

/** Cache TTL in milliseconds (5 minutes). */
const TENANT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * TenantMiddleware -- resolves tenant from subdomain on every request.
 *
 * Example:
 *   universite-montreal.lms.example.com -> tenantSlug = "universite-montreal"
 *   api.lms.example.com               -> rejected (no tenant)
 *
 * The resolved tenantId and tenantSlug are injected into request for downstream use.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly rootDomain = process.env["ROOT_DOMAIN"] ?? "lms.example.com";

  /**
   * In-memory cache: slug -> { tenantId, resolvedAt }.
   */
  private readonly tenantCache = new Map<string, TenantCacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async use(
    req: FastifyRequest & { tenantId?: string; tenantSlug?: string },
    _res: FastifyReply,
    next: () => void,
  ): Promise<void> {
    const host = req.hostname ?? "";

    // Health check and internal routes bypass tenant resolution
    if (req.url.startsWith("/health") || req.url.startsWith("/internal")) {
      next();
      return;
    }

    const tenantSlug = this.extractTenantSlug(req, host);
    if (!tenantSlug) {
      throw new BadRequestException("Unable to resolve tenant from hostname");
    }

    req.tenantSlug = tenantSlug;

    // Check in-memory cache first
    const cached = this.tenantCache.get(tenantSlug);
    if (cached && Date.now() - cached.resolvedAt < TENANT_CACHE_TTL_MS) {
      req.tenantId = cached.tenantId;
      next();
      return;
    }

    // Await DB lookup — no race condition
    await this.resolveTenant(tenantSlug, req);
    next();
  }

  private async resolveTenant(
    tenantSlug: string,
    req: FastifyRequest & { tenantId?: string },
  ): Promise<void> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, isActive: true, deletedAt: true },
      });

      if (!tenant || !tenant.isActive || tenant.deletedAt) {
        // Fall back to slug-based ID for dev/test environments
        req.tenantId = `tenant:${tenantSlug}`;
        return;
      }

      req.tenantId = tenant.id;
      this.tenantCache.set(tenantSlug, {
        tenantId: tenant.id,
        resolvedAt: Date.now(),
      });
    } catch {
      // DB not available -- fall back to slug-based placeholder
      req.tenantId = `tenant:${tenantSlug}`;
    }
  }

  private extractTenantSlug(
    req: FastifyRequest,
    host: string,
  ): string | null {
    // Remove port if present
    const hostname = host.split(":")[0] ?? "";

    // localhost / 127.0.0.1 -> support X-Tenant-Slug header for dev/testing
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      const headerSlug = req.headers["x-tenant-slug"];
      if (typeof headerSlug === "string" && headerSlug.length > 0) {
        return headerSlug;
      }
      return "dev";
    }

    // Extract subdomain: "org.lms.example.com" -> "org"
    if (hostname.endsWith(`.${this.rootDomain}`)) {
      const subdomain = hostname.slice(0, -(this.rootDomain.length + 1));
      if (subdomain && !subdomain.includes(".")) {
        return subdomain;
      }
    }

    return null;
  }
}
