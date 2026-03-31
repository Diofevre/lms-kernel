import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest, NextMiddleware } from "next/server";

const ROOT_DOMAIN = process.env["ROOT_DOMAIN"] ?? "lms.example.com";

/**
 * Combined middleware:
 *  1. Tenant resolution from subdomain → x-tenant-slug header
 *  2. NextAuth session check via the `auth` wrapper
 *  3. Redirect logged-in users AWAY from /login (they belong on /dashboard)
 *  4. Cache-Control: no-store on protected pages (back-button fix)
 */
const middleware: NextMiddleware = auth((req: NextRequest) => {
  const hostname = req.nextUrl.hostname;
  const tenantSlug = extractTenantSlug(hostname);
  const { pathname } = req.nextUrl;

  // @ts-expect-error — auth() injects `auth` on the request
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  const authPages = ["/login", "/forgot-password"];
  const isAuthPage = authPages.some((p) => pathname.startsWith(p));

  // RULE: Logged-in user on /login → redirect to /dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const response = NextResponse.next();

  // Tenant slug + interface type headers
  if (tenantSlug) {
    response.headers.set("x-tenant-slug", tenantSlug);
    response.headers.set("x-interface-type", isAdminInterface(tenantSlug) ? "super_admin" : "tenant");
  }

  // Prevent browser caching on authenticated pages (back-button fix after logout)
  if (!isAuthPage && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}) as unknown as NextMiddleware;

export default middleware;

/** Reserved slug: admin.app.kern.dev → super admin interface */
const ADMIN_SLUG = "admin";

function extractTenantSlug(hostname: string): string | null {
  if (hostname === "localhost" || hostname === "127.0.0.1") return "dev";
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    if (slug && !slug.includes(".")) return slug;
  }
  return null;
}

function isAdminInterface(slug: string | null): boolean {
  return slug === ADMIN_SLUG;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon\\.png|logo-.*\\.svg|logo-.*\\.png).*)"],
};
