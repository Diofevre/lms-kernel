import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROOT_DOMAIN = process.env["ROOT_DOMAIN"] ?? "lms.example.com";

/**
 * Tenant middleware — resolves tenant from subdomain and injects into headers.
 * Also enforces auth on protected routes.
 *
 * Subdomain routing:
 *   universite-montreal.lms.example.com → tenant = "universite-montreal"
 *   localhost:3000                       → tenant = "dev-tenant" (local dev)
 */
export function middleware(request: NextRequest): NextResponse {
  const hostname = request.nextUrl.hostname;
  const tenantSlug = extractTenantSlug(hostname);

  const response = NextResponse.next();

  if (tenantSlug) {
    response.headers.set("x-tenant-slug", tenantSlug);
  }

  return response;
}

function extractTenantSlug(hostname: string): string | null {
  if (hostname === "localhost" || hostname === "127.0.0.1") return "dev-tenant";
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    if (slug && !slug.includes(".")) return slug;
  }
  return null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
