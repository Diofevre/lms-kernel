"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@kern/ui";
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  Lock,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "users", href: "/admin/users", icon: Users },
  { labelKey: "organizations", href: "/admin/tenants", icon: Building2 },
  { labelKey: "audit", href: "/admin/audit", icon: Shield },
  { labelKey: "privacy", href: "/admin/privacy", icon: Lock },
  { labelKey: "settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("sidebar");
  const [mobileOpen, setMobileOpen] = useState(false);
  const userName = session?.user?.name ?? session?.user?.email ?? t("dashboard");
  const userInitial = userName.charAt(0).toUpperCase();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          aria-label="Kern - Retour au tableau de bord"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="" className="h-8 w-auto brightness-0 invert" />
          <span className="text-xl font-bold text-white tracking-tight">Kern</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav aria-label="Navigation principale" className="flex-1 px-3">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 px-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xs font-medium text-white">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName}
            </p>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-white transition-colors"
            aria-label={t("logout")}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 lg:hidden rounded-md bg-slate-900 p-2 text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-nav"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        id="sidebar-nav"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0f172a] transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
