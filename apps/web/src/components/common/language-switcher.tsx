"use client";

import { useTranslations } from "next-intl";

const locales = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
] as const;

/**
 * Language switcher — sets a cookie and reloads the page.
 * Compact button group: FR | EN | ES
 */
export function LanguageSwitcher() {
  const t = useTranslations("language");

  function setLocale(code: string) {
    document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
    window.location.reload();
  }

  // Read current locale from cookie
  const current =
    typeof document !== "undefined"
      ? (document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)?.[1] ?? "fr")
      : "fr";

  return (
    <div className="inline-flex items-center rounded-md border border-gray-200 bg-white text-xs" role="group" aria-label={t("fr")}>
      {locales.map(({ code, label }, i) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1.5 font-medium transition-colors ${
            current === code
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          } ${i === 0 ? "rounded-l-md" : ""} ${i === locales.length - 1 ? "rounded-r-md" : ""}`}
          aria-pressed={current === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
