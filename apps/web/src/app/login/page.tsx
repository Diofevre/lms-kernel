import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Connexion — Kern",
  description: "Connectez-vous a votre compte Kern.",
};

/**
 * /login — server component shell. The interactive form is a client component
 * wrapped in Suspense because it uses useSearchParams().
 */
export default function LoginPage() {
  return (
    <div className="w-full max-w-[400px]">
      {/* Logo — replaced per tenant via theming */}
      <div className="mb-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icon.svg"
          alt="Kern"
          className="mx-auto h-12 w-auto"
        />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
          Kern
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Connectez-vous pour continuer
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex h-[420px] items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-gray-400">
        <a href="/terms" className="hover:text-gray-600 hover:underline">
          Conditions d&apos;utilisation
        </a>
        {" \u2022 "}
        <a href="/privacy" className="hover:text-gray-600 hover:underline">
          Politique de confidentialit&eacute;
        </a>
      </p>
    </div>
  );
}
