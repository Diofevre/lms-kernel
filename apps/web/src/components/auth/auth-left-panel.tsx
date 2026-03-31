"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@kern/ui";
import { useTenantTheme } from "@/components/theme/tenant-theme-provider";

/**
 * Left panel for auth pages — dark background with gradient blobs,
 * logo, dynamic title/subtitle, and step indicators.
 * Adapted from MyATPS AuthLeftPanel pattern.
 */
export function AuthLeftPanel() {
  const pathname = usePathname();
  const tenantTheme = useTenantTheme();
  const isSignIn = pathname === "/login";
  const isForgotPassword = pathname === "/forgot-password";

  let title = "Bienvenue";
  let subtitle = "Connectez-vous pour accéder à votre espace.";

  if (isForgotPassword) {
    title = "Réinitialisation";
    subtitle = "Entrez votre courriel pour recevoir un lien de réinitialisation.";
  }

  return (
    <div className="w-full h-full flex flex-col justify-center items-center relative overflow-hidden rounded-[2rem] m-4 shrink-0">
      {/* Dark background */}
      <div className="absolute inset-0 bg-[#0f172a]" />

      {/* Gradient blob top-left */}
      <div className="absolute z-0 left-[-246px] top-[-186px] rounded-[603px] w-[658px] h-[548px] bg-[linear-gradient(148deg,#80a9fc_0%,#d37bff_31.09%,#fcab83_70.46%,#ff49d4_100%)] blur-[80px] opacity-[0.3]" />
      {/* Gradient blob bottom-right */}
      <div className="absolute z-0 right-[-86px] bottom-[100px] rounded-[603px] w-[658px] h-[548px] bg-[linear-gradient(145deg,#efe8f6_0%,#d588fb_60.83%,#ff49d4_100%)] blur-[80px] opacity-[0.3]" />

      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 mb-10 text-white transition-opacity hover:opacity-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tenantTheme.logoUrl ?? "/logo-icon.svg"} alt="" className="h-7 w-auto brightness-0 invert" />
          <span className="text-xl font-semibold tracking-tight">{tenantTheme.name}</span>
        </Link>

        <h1 className="text-4xl font-bold tracking-tight text-white mb-3 text-center">
          {title}
        </h1>
        <p className="text-slate-400 text-center mb-12 max-w-[300px] text-[15px]">
          {subtitle}
        </p>

        {/* Step indicators */}
        <div className="w-full space-y-4">
          <Link
            href="/login"
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl transition-colors",
              isSignIn
                ? "bg-white text-black shadow-lg"
                : "bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10",
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0",
              isSignIn ? "bg-black text-white" : "bg-white/10 text-slate-300",
            )}>
              1
            </div>
            <span className={cn("text-sm", isSignIn ? "font-semibold" : "font-medium")}>
              Connexion à votre compte
            </span>
          </Link>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 text-slate-300">
            <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 bg-white/10 text-slate-300">
              2
            </div>
            <span className="text-sm font-medium">
              Accéder à votre espace
            </span>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            Loi 25
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            WCAG 2.1 AA
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            Chiffré
          </div>
        </div>
      </div>
    </div>
  );
}
