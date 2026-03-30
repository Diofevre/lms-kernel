/**
 * NextAuth v5 configuration for Kern.
 *
 * NO WORKAROUNDS:
 * - Types properly augmented in types/next-auth.d.ts (zero `as any`)
 * - Keycloak access_token stored via User object → JWT callback → Session
 * - Session maxAge 30 minutes, token expiration tracked
 */

import NextAuth from "next-auth";
import type { NextAuthConfig, NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import Google from "next-auth/providers/google";

const JWT_MAX_AGE = 30 * 60; // 30 minutes

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Courriel", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const { keycloakLogin, keycloakUserinfo } = await import("@kern/iam");

          const tokenResponse = await keycloakLogin(
            String(credentials.email).trim(),
            String(credentials.password),
          );

          const userinfo = await keycloakUserinfo(tokenResponse.access_token);

          const givenName = (userinfo["given_name"] as string) ?? "";
          const familyName = (userinfo["family_name"] as string) ?? "";
          const preferredUsername = (userinfo["preferred_username"] as string) ?? "";
          const email = (userinfo["email"] as string) ?? "";

          const name: string | null =
            [givenName, familyName].filter(Boolean).join(" ") ||
            preferredUsername ||
            email ||
            null;

          return {
            id: userinfo["sub"] as string,
            email,
            name,
            image: null,
            // Stored in JWT via the jwt callback below
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
          };
        } catch {
          return null;
        }
      },
    }),
    Keycloak({
      clientId: process.env["KEYCLOAK_CLIENT_ID"] ?? "kern-web",
      clientSecret: process.env["KEYCLOAK_CLIENT_SECRET"] ?? "",
      issuer: `${(process.env["KEYCLOAK_URL"] ?? "http://localhost:8080").replace(/\/$/, "")}/realms/${process.env["KEYCLOAK_REALM"] ?? "kern"}`,
    }),
    Google({
      clientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    jwt({ token, account, user }) {
      const now = Math.floor(Date.now() / 1000);

      // OAuth provider login (Keycloak OIDC, Google)
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? undefined;
        token.provider = account.provider;
        token.expiresAt = now + ((account.expires_in as number) ?? JWT_MAX_AGE);
        return token;
      }

      // Credentials login — tokens come from the User object
      if (user?.accessToken) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.provider = "credentials";
        token.expiresAt = now + JWT_MAX_AGE;
        return token;
      }

      // Check expiration
      if (token.expiresAt && now >= token.expiresAt) {
        token.error = "SessionExpired";
      }

      return token;
    },

    session({ session, token }) {
      // Properly typed — no `as any` needed thanks to type augmentation
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },

    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const publicPaths = ["/login", "/forgot-password", "/api/auth"];
      if (publicPaths.some((p) => pathname.startsWith(p))) return true;
      if (pathname.startsWith("/_next") || pathname === "/favicon.ico") return true;
      return !!auth?.user;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: JWT_MAX_AGE,
  },
};

const nextAuth: NextAuthResult = NextAuth(authConfig);
export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;
