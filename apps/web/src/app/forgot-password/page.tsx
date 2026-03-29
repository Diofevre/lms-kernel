"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * /forgot-password — placeholder for Keycloak password reset.
 *
 * In production, this form would call a server action that triggers
 * the Keycloak password-reset email via the Admin API.
 * For now it shows a success message after submit.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  function validateEmail(value: string): string | null {
    if (!value.trim()) return "Le courriel est requis.";
    if (!EMAIL_RE.test(value)) return "Format de courriel invalide.";
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setIsLoading(true);

    // Simulate network delay — replace with real Keycloak Admin API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
    setIsSent(true);
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Header */}
      <div className="mb-8 text-center">
        <div
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-black"
          aria-hidden="true"
        >
          <span className="text-lg font-bold text-white">K</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
          Mot de passe oubli&eacute;
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Entrez votre courriel pour recevoir un lien de r&eacute;initialisation.
        </p>
      </div>

      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        {isSent ? (
          /* Success state */
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Mail className="h-5 w-5 text-gray-600" aria-hidden="true" />
            </div>
            <h2 className="text-base font-medium text-gray-900">
              V&eacute;rifiez votre courriel
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Si un compte existe pour{" "}
              <span className="font-medium text-gray-700">{email}</span>, un
              lien de r&eacute;initialisation a &eacute;t&eacute; envoy&eacute;.
            </p>
            <a
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour a la connexion
            </a>
          </div>
        ) : (
          /* Form state */
          <>
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-6">
                <label
                  htmlFor="reset-email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Courriel
                </label>
                <input
                  id="reset-email"
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
                  aria-describedby={
                    emailError ? "reset-email-error" : undefined
                  }
                  className={`block h-11 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                    emailError ? "border-red-400" : "border-gray-200"
                  }`}
                  placeholder="nom@exemple.com"
                  disabled={isLoading}
                />
                {emailError && (
                  <p
                    id="reset-email-error"
                    className="mt-1 text-xs text-red-600"
                  >
                    {emailError}
                  </p>
                )}
              </div>

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
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer le lien de reinitialisation"
                )}
              </button>
            </form>

            <a
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour a la connexion
            </a>
          </>
        )}
      </div>
    </div>
  );
}
