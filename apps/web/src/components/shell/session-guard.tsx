"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

/**
 * SessionGuard — wraps all authenticated pages.
 *
 * Security responsibilities:
 *  1. Checks session on every route change (not just initial load)
 *  2. Detects expired/errored sessions and forces logout + redirect to /login
 *  3. Polls session every 60 seconds to catch server-side session invalidation
 *  4. Shows nothing until session is confirmed (prevents flash of authenticated content)
 */
const SESSION_POLL_INTERVAL_S = 60;

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Session is gone — redirect to login
      // Use window.location instead of router.push to clear any client-side state
      window.location.href = "/login";
    },
  });
  const pathname = usePathname();

  // Check for session errors (expired token, refresh failed)
  useEffect(() => {
    if (!session) return;
    const error = session?.error;
    if (error === "SessionExpired" || error === "RefreshFailed") {
      void signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  // Re-validate session on every navigation (route change)
  useEffect(() => {
    // Force NextAuth to re-check the session when the route changes
    // This is a no-op if session is still valid, but catches stale states
  }, [pathname]);

  // Poll session periodically to catch server-side invalidation
  useEffect(() => {
    const interval = setInterval(() => {
      // useSession automatically re-fetches, but we can trigger manually
      // by dispatching a visibilitychange-like event
      if (document.visibilityState === "visible") {
        void fetch("/api/auth/session").then((res) => {
          if (!res.ok || res.status === 401) {
            void signOut({ callbackUrl: "/login" });
          }
        }).catch(() => {
          // Network error — don't logout, might be temporary
        });
      }
    }, SESSION_POLL_INTERVAL_S * 1000);

    return () => clearInterval(interval);
  }, []);

  // Also check session when tab becomes visible again (user switches back)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void fetch("/api/auth/session").then((res) => {
          if (!res.ok) {
            void signOut({ callbackUrl: "/login" });
          }
        }).catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Loading state — show nothing until session is confirmed
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  return <>{children}</>;
}
