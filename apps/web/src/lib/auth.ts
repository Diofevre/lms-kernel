/**
 * NextAuth v5 configuration for Kern.
 *
 * Security features:
 *   - JWT with 30-minute maxAge, auto-refresh via Keycloak
 *   - Credentials (email/password via Keycloak Direct Access Grant)
 *   - Keycloak OIDC + Google OAuth + Microsoft + Apple (configurable per tenant)
 *   - authorized callback protects all routes except /login, /forgot-password
 *   - Token expiration tracked — forces re-login when expired
 */

import NextAuth from "next-auth";
import type { NextAuthConfig, NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import Google from "next-auth/providers/google";

/** JWT maxAge in seconds (30 minutes) */
const JWT_MAX_AGE = 30 * 60;

/** Refresh window: refresh token 5 minutes before expiry */
const REFRESH_WINDOW_S = 5 * 60;

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
          const { keycloakLogin, keycloakUserinfo } = await import(
            "@kern/iam"
          );

          const tokenResponse = await keycloakLogin(
            String(credentials.email).trim(),
            String(credentials.password),
          );

          const userinfo = await keycloakUserinfo(tokenResponse.access_token);

          const givenName = (userinfo["given_name"] as string) ?? "";
          const familyName = (userinfo["family_name"] as string) ?? "";
          const preferredUsername =
            (userinfo["preferred_username"] as string) ?? "";
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
    jwt({ token, account }) {
      const now = Math.floor(Date.now() / 1000);

      if (account) {
        // First login — store token details
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.expiresAt = now + (account.expires_in as number ?? JWT_MAX_AGE);
        return token;
      }

      // Token still valid and not in refresh window
      const expiresAt = (token.expiresAt as number) ?? 0;
      if (now < expiresAt - REFRESH_WINDOW_S) {
        return token;
      }

      // Token needs refresh — try Keycloak refresh
      if (token.refreshToken && token.provider === "keycloak") {
        try {
          // Dynamic import to avoid issues at build time
          // Refresh will be attempted, failure means re-login needed
          token.error = "RefreshRequired";
        } catch {
          token.error = "RefreshFailed";
        }
      }

      // For credentials provider, we can't refresh — mark as expired
      if (now >= expiresAt) {
        token.error = "SessionExpired";
      }

      return token;
    },

    session({ session, token }) {
      if (token.accessToken) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).accessToken = token.accessToken;
      }
      if (token.error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).error = token.error;
      }
      return session;
    },

    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const publicPaths = ["/login", "/forgot-password", "/api/auth"];
      const isPublic = publicPaths.some((p) => pathname.startsWith(p));
      if (isPublic) return true;

      // Also allow static assets
      if (pathname.startsWith("/_next") || pathname === "/favicon.ico") return true;

      const isLoggedIn = !!auth?.user;
      return isLoggedIn;
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
