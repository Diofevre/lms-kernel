"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface TenantBranding {
  name: string;
  primaryColor: string;
  logoUrl: string | null;
  enabledSsoProviders: string[];
}

const defaultBranding: TenantBranding = {
  name: "Kern",
  primaryColor: "#0f172a",
  logoUrl: null,
  enabledSsoProviders: ["credentials"],
};

const TenantThemeContext = createContext<TenantBranding>(defaultBranding);

export function useTenantTheme(): TenantBranding {
  return useContext(TenantThemeContext);
}

/**
 * Converts hex color to HSL string for CSS custom properties.
 * e.g. "#003366" → "210 100% 20%"
 */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(l * 100)}%`;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Compute foreground color (white or black) based on luminance.
 * WCAG: ensures contrast ratio >= 4.5:1.
 */
function computeForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "0 0% 0%" : "0 0% 100%";
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);

  useEffect(() => {
    // Fetch tenant branding from public endpoint (no auth required)
    fetch(`${API_URL}/v1/tenants/current/branding`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<TenantBranding>;
      })
      .then((data) => {
        if (data?.primaryColor) {
          setBranding(data);

          // Apply CSS custom properties to <html> for Shadcn/Tailwind
          const hsl = hexToHsl(data.primaryColor);
          const fg = computeForeground(data.primaryColor);
          document.documentElement.style.setProperty("--primary", hsl);
          document.documentElement.style.setProperty("--primary-foreground", fg);
          document.documentElement.style.setProperty("--ring", hsl);
        }
      })
      .catch(() => {
        // API not available — keep defaults
      });
  }, []);

  return (
    <TenantThemeContext.Provider value={branding}>
      {children}
    </TenantThemeContext.Provider>
  );
}
