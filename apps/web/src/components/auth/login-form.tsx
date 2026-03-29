"use client";

import { useState, useCallback, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { SsoButtons } from "./sso-buttons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 4;

/**
 * Login form — client component.
 *
 * Email/password signs in via the Credentials provider which calls
 * Keycloak Direct Access Grant under the hood. SSO buttons trigger
 * OAuth redirects through NextAuth.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(
    errorParam === "CredentialsSignin"
      ? "Courriel ou mot de passe incorrect."
      : errorParam
        ? "Une erreur est survenue. Veuillez reessayer."
        : null,
  );

  /* ---------------------------------------------------------------- */
  /* Validation                                                        */
  /* ---------------------------------------------------------------- */

  function validateEmail(value: string): string | null {
    if (!value.trim()) return "Le courriel est requis.";
    if (!EMAIL_RE.test(value)) return "Format de courriel invalide.";
    return null;
  }

  function validatePassword(value: string): string | null {
    if (!value) return "Le mot de passe est requis.";
    if (value.length < MIN_PASSWORD_LENGTH)
      return `Le mot de passe doit contenir au moins ${String(MIN_PASSWORD_LENGTH)} caracteres.`;
    return null;
  }

  /* ---------------------------------------------------------------- */
  /* Submit                                                            */
  /* ---------------------------------------------------------------- */

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setServerError(null);

      const eErr = validateEmail(email);
      const pErr = validatePassword(password);
      setEmailError(eErr);
      setPasswordError(pErr);
      if (eErr || pErr) return;

      setIsLoading(true);
      try {
        const result = await signIn("credentials", {
          email: email.trim(),
          password,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          setServerError("Courriel ou mot de passe incorrect.");
        } else if (result?.url) {
          window.location.href = result.url;
        }
      } catch {
        setServerError("Une erreur est survenue. Veuillez reessayer.");
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, callbackUrl],
  );

  /* ---------------------------------------------------------------- */
  /* SSO                                                               */
  /* ---------------------------------------------------------------- */

  async function handleSsoSignIn(provider: string) {
    setServerError(null);
    await signIn(provider, { callbackUrl });
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className="mb-4">
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Courriel
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={() => setEmailError(validateEmail(email))}
            aria-invalid={emailError ? "true" : undefined}
            aria-describedby={emailError ? "login-email-error" : undefined}
            className={`block h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
              emailError ? "border-red-400" : "border-gray-200"
            }`}
            placeholder="nom@exemple.com"
            disabled={isLoading}
          />
          {emailError && (
            <p id="login-email-error" className="mt-1 text-xs text-red-600">
              {emailError}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="mb-4">
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onBlur={() => setPasswordError(validatePassword(password))}
              aria-invalid={passwordError ? "true" : undefined}
              aria-describedby={
                passwordError ? "login-password-error" : undefined
              }
              className={`block h-11 w-full rounded-lg border bg-white px-3 pr-10 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                passwordError ? "border-red-400" : "border-gray-200"
              }`}
              placeholder="Votre mot de passe"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
              aria-label={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {passwordError && (
            <p
              id="login-password-error"
              className="mt-1 text-xs text-red-600"
            >
              {passwordError}
            </p>
          )}
        </div>

        {/* Forgot password */}
        <div className="mb-6 flex justify-end">
          <a
            href="/forgot-password"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline"
          >
            Mot de passe oublié ?
          </a>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Connexion en cours...
            </>
          ) : (
            "Connexion"
          )}
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
    </div>
  );
}
