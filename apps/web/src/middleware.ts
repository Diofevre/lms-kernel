import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest, NextMiddleware } from "next/server";

const ROOT_DOMAIN = process.env["ROOT_DOMAIN"] ?? "lms.example.com";

/**
 * Combined middleware:
 *  1. Tenant resolution from subdomain → x-tenant-slug header
 *  2. NextAuth session check via the `auth` wrapper
 *  3. Cache-Control: no-store on protected pages (prevents back-button showing stale authenticated content)
 */
const middleware: NextMiddleware = auth((req: NextRequest) => {
  const hostname = req.nextUrl.hostname;
  const tenantSlug = extractTenantSlug(hostname);
  const { pathname } = req.nextUrl;

  const response = NextResponse.next();

  // Tenant slug header
  if (tenantSlug) {
    response.headers.set("x-tenant-slug", tenantSlug);
  }

  // CRITICAL: Prevent browser from caching authenticated pages
  // This ensures pressing "back" after logout forces a server revalidation
  // instead of showing stale cached page content
  const publicPaths = ["/login", "/forgot-password"];
  const isPublicPage = publicPaths.some((p) => pathname.startsWith(p));

  if (!isPublicPage && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}) as unknown as NextMiddleware;

export default middleware;

function extractTenantSlug(hostname: string): string | null {
  if (hostname === "localhost" || hostname === "127.0.0.1") return "dev-tenant";
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    if (slug && !slug.includes(".")) return slug;
  }
  return null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-.*\\.svg|logo-.*\\.png).*)"],
};
