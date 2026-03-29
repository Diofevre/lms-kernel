"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import Link from "next/link";

const pathLabels: Record<string, string> = {
  dashboard: "Tableau de bord",
  admin: "Administration",
  users: "Utilisateurs",
  tenants: "Organisations",
  audit: "Audit",
  privacy: "Confidentialite",
  settings: "Parametres",
};

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";

  for (const segment of segments) {
    path += `/${segment}`;
    const label = pathLabels[segment] ?? segment;
    crumbs.push({ label, href: path });
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="hidden sm:block">
        <ol className="flex items-center gap-1 text-sm" role="list">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 text-gray-400"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span className="font-medium text-gray-900" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile: page title only */}
      <div className="sm:hidden pl-12">
        <span className="font-medium text-gray-900 text-sm">
          {breadcrumbs[breadcrumbs.length - 1]?.label ?? "Kern"}
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-md p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
