/**
 * NextAuth v5 configuration for Kern.
 *
 * IMPORTANT: The Credentials provider stores the Keycloak access_token
 * in the user object, which is then propagated to the JWT token.
 * This allows frontend pages to call the NestJS API with a valid Bearer token.
 */

import NextAuth from "next-auth";
import type { NextAuthConfig, NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import Google from "next-auth/providers/google";

/** JWT maxAge in seconds (30 minutes) */
const JWT_MAX_AGE = 30 * 60;

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

          // CRITICAL: Store Keycloak tokens in the user object
          // They will be picked up by the JWT callback below
          return {
            id: userinfo["sub"] as string,
            email,
            name,
            image: null,
            // Custom fields — propagated via JWT callback
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
          } as Record<string, unknown>;
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

      // First login via OAuth provider (Keycloak OIDC, Google, etc.)
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.expiresAt = now + ((account.expires_in as number) ?? JWT_MAX_AGE);
        return token;
      }

      // First login via Credentials — tokens are on the user object
      if (user && (user as Record<string, unknown>).accessToken) {
        token.accessToken = (user as Record<string, unknown>).accessToken;
        token.refreshToken = (user as Record<string, unknown>).refreshToken;
        token.provider = "credentials";
        token.expiresAt = now + JWT_MAX_AGE;
        return token;
      }

      return token;
    },

    session({ session, token }) {
      // Expose accessToken to the client so pages can call the API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).accessToken = token.accessToken;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).error = token.error;
      return session;
    },

    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const publicPaths = ["/login", "/forgot-password", "/api/auth"];
      const isPublic = publicPaths.some((p) => pathname.startsWith(p));
      if (isPublic) return true;
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
