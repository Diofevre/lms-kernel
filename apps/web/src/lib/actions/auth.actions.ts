"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect";

/**
 * Server action for credentials login.
 *
 * NextAuth v5 signIn() throws NEXT_REDIRECT on success.
 * We catch it and re-throw so Next.js can handle the redirect properly.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
  callbackUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });

    // If we reach here, no redirect happened (shouldn't normally happen)
    return { success: true };
  } catch (error) {
    // NextAuth v5 throws a redirect error on SUCCESS — let it through!
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { success: false, error: "Courriel ou mot de passe incorrect." };
      }
      return { success: false, error: "Erreur d'authentification." };
    }

    return { success: false, error: "Une erreur est survenue." };
  }
}
