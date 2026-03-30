"use client";

import { useTranslations } from "next-intl";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center space-y-4 px-6">
        <p className="text-7xl font-bold text-gray-900 tracking-tight">500</p>
        <h1 className="text-xl font-semibold text-gray-900">{t("serverError")}</h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">{t("serverErrorHint")}</p>
        <div className="pt-4">
          <button type="button" onClick={reset}
            className="inline-flex rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
            {t("retry")}
          </button>
        </div>
      </div>
    </div>
  );
}
