"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { SsoButtons } from "./sso-buttons";
import { loginWithCredentials } from "@/lib/actions/auth.actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Error messages by NextAuth error code */
const ERROR_MESSAGES: Record<string, { icon: typeof AlertCircle; title: string; message: string; color: string }> = {
  SessionExpired: { icon: Clock, title: "Session expirée", message: "Votre session a expiré. Veuillez vous reconnecter.", color: "amber" },
  CredentialsSignin: { icon: AlertCircle, title: "Connexion refusée", message: "Courriel ou mot de passe incorrect.", color: "red" },
  OAuthCallback: { icon: AlertCircle, title: "Erreur d'authentification", message: "Une erreur est survenue lors de la connexion.", color: "red" },
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const errorParam = searchParams.get("error");

  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Show error from URL params (redirect-based errors like SessionExpired)
  const urlError = errorParam ? ERROR_MESSAGES[errorParam] ?? { icon: AlertCircle, title: "Erreur", message: "Une erreur est survenue.", color: "red" } : null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setEmailError(null);
    setPasswordError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    let hasError = false;
    if (!email) { setEmailError("Le courriel est requis."); hasError = true; }
    else if (!EMAIL_RE.test(email)) { setEmailError("Format de courriel invalide."); hasError = true; }
    if (!password) { setPasswordError("Le mot de passe est requis."); hasError = true; }
    if (hasError) return;

    setIsLoading(true);
    try {
      // Server action handles signIn — on success, it throws a redirect
      // which Next.js catches and performs the navigation automatically.
      // On failure, it returns { success: false, error: "..." }.
      const result = await loginWithCredentials(email, password, callbackUrl);

      if (!result.success) {
        setServerError(result.error ?? "Courriel ou mot de passe incorrect.");
        setIsLoading(false);
        return;
      }

      // If we reach here (no redirect thrown), force navigation
      window.location.href = callbackUrl;
    } catch {
      // The redirect error from NextAuth is re-thrown by the server action.
      // Next.js will handle it — but just in case it bubbles up here:
      // Don't show an error, the redirect is happening.
    }
  }

  async function handleSsoSignIn(provider: string) {
    setServerError(null);
    await signIn(provider, { callbackUrl });
  }

  return (
    <>
      {/* URL-based error banner (e.g. SessionExpired redirect) */}
      {urlError && !serverError && (
        <div className={`mb-6 rounded-xl border p-4 ${
          urlError.color === "amber" ? "border-amber-500/30 bg-amber-500/10" : "border-red-500/30 bg-red-500/10"
        }`}>
          <div className="flex items-start gap-3">
            <urlError.icon className={`h-5 w-5 shrink-0 ${urlError.color === "amber" ? "text-amber-500" : "text-red-500"}`} />
            <div>
              <p className={`text-sm font-medium ${urlError.color === "amber" ? "text-amber-500" : "text-red-500"}`}>
                {urlError.title}
              </p>
              <p className="mt-1 text-xs text-gray-500">{urlError.message}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} method="post" className="mt-8 space-y-5" noValidate>
        {/* Server error */}
        {serverError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-500">Connexion refusée</p>
                <p className="mt-1 text-xs text-gray-500">{serverError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="login-email" className={`block text-sm font-medium ${emailError ? "text-red-500" : "text-gray-700"}`}>
            Courriel
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            disabled={isLoading}
            aria-invalid={emailError ? "true" : undefined}
            className={`block h-12 w-full rounded-xl border bg-gray-100 px-3 text-sm text-gray-900 placeholder:text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
              emailError ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"
            }`}
          />
          {emailError && <p className="text-xs text-red-500">{emailError}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="login-password" className={`block text-sm font-medium ${passwordError ? "text-red-500" : "text-gray-700"}`}>
            Mot de passe
          </label>
          <PasswordInput id="login-password" name="password" disabled={isLoading} error={passwordError} />
          {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
        </div>

        {/* Forgot password */}
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-gray-600 hover:text-gray-900">
            Mot de passe oublié ?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Se connecter
        </button>
      </form>

      {/* Separator */}
      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">ou continuer avec</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* SSO */}
      <SsoButtons onSsoSignIn={handleSsoSignIn} disabled={isLoading} />
    </>
  );
}

function PasswordInput({ id, name, disabled, error }: { id: string; name: string; disabled: boolean; error: string | null }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete="current-password"
        placeholder="Votre mot de passe"
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        className={`block h-12 w-full rounded-xl border bg-gray-100 px-3 pr-10 text-sm text-gray-900 placeholder:text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
          error ? "border-red-500 ring-1 ring-red-500" : "border-gray-200"
        }`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
