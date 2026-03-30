import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/common/language-switcher";

export const metadata = {
  title: "Connexion — Kern",
};

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="w-full max-w-[420px]">
      {/* Security badge */}
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span className="text-xs font-medium uppercase tracking-widest text-emerald-600">
          {t("secureConnection")}
        </span>
      </div>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-gray-900">
          {t("signIn")}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {t("signInSubtitle")}
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex h-[380px] items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      {/* Footer with language switcher */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <LanguageSwitcher />
        <p className="text-center text-xs text-gray-400">
          <a href="/terms" className="hover:text-gray-600 hover:underline">
            {t("terms")}
          </a>
          {" \u2022 "}
          <a href="/privacy" className="hover:text-gray-600 hover:underline">
            {t("privacy")}
          </a>
        </p>
      </div>
    </div>
  );
}
