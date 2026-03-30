import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center space-y-4 px-6">
        <p className="text-7xl font-bold text-gray-900 tracking-tight">404</p>
        <h1 className="text-xl font-semibold text-gray-900">{t("notFound")}</h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">{t("notFoundHint")}</p>
        <div className="pt-4">
          <Link href="/dashboard" className="inline-flex rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
