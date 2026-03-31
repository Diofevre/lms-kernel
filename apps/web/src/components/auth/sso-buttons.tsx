"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTenantTheme } from "@/components/theme/tenant-theme-provider";

interface SsoButtonsProps {
  onSsoSignIn: (provider: string) => Promise<void>;
  disabled?: boolean;
}

/** SSO provider config — maps provider key to display info */
const SSO_PROVIDERS = [
  { key: "google", providerKey: "google", label: "Google", Icon: GoogleIcon },
  { key: "microsoft", providerKey: "microsoft-entra-id", label: "Microsoft", Icon: MicrosoftIcon },
  { key: "apple", providerKey: "apple", label: "Apple", Icon: AppleIcon },
] as const;

/**
 * SSO buttons — only shows providers enabled for the current tenant.
 * Reads enabledSsoProviders from TenantThemeProvider.
 */
export function SsoButtons({ onSsoSignIn, disabled }: SsoButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const tenantTheme = useTenantTheme();

  // Filter SSO buttons by tenant's enabled providers
  const enabledProviders = SSO_PROVIDERS.filter((p) =>
    tenantTheme.enabledSsoProviders.includes(p.key),
  );

  // Don't render the section if no SSO providers are enabled
  if (enabledProviders.length === 0) return null;

  async function handleClick(provider: string) {
    setLoadingProvider(provider);
    try {
      await onSsoSignIn(provider);
    } finally {
      setLoadingProvider(null);
    }
  }

  const isDisabled = disabled || loadingProvider !== null;

  return (
    <div className="flex gap-3">
      {enabledProviders.map(({ providerKey, label, Icon }) => (
        <button
          key={providerKey}
          type="button"
          disabled={isDisabled}
          onClick={() => handleClick(providerKey)}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Continuer avec ${label}`}
        >
          {loadingProvider === providerKey ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Icon />
          )}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Inline SVG icons ─────────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.53 8.7 9.28c1.25.07 2.12.72 2.86.76.99-.2 1.94-.78 3-.72 1.28.1 2.24.61 2.88 1.56-2.63 1.57-2.01 5.02.36 5.98-.47 1.24-1.08 2.46-1.75 3.42ZM12.05 9.2c-.12-2.35 1.83-4.35 4.05-4.55.3 2.62-2.37 4.6-4.05 4.55Z" />
    </svg>
  );
}
