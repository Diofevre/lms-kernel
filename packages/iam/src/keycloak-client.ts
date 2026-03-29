/**
 * Keycloak Admin & Auth client for Kern.
 * Handles token exchange, user management, and realm operations.
 *
 * Uses native fetch — no external HTTP dependencies required.
 * Adapted from the MyATPS keycloak-api.ts pattern for the Kern monorepo.
 */

export interface KeycloakConfig {
  url: string; // e.g. http://localhost:8080
  realm: string; // e.g. "kern"
  clientId: string; // e.g. "kern-api"
  clientSecret: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

function getConfig(): KeycloakConfig {
  return {
    url: (process.env["KEYCLOAK_URL"] ?? "http://localhost:8080").replace(
      /\/$/,
      "",
    ),
    realm: process.env["KEYCLOAK_REALM"] ?? "kern",
    clientId: process.env["KEYCLOAK_CLIENT_ID"] ?? "kern-api",
    clientSecret: process.env["KEYCLOAK_CLIENT_SECRET"] ?? "",
  };
}

function getTokenUrl(config: KeycloakConfig): string {
  return `${config.url}/realms/${config.realm}/protocol/openid-connect/token`;
}

function getUserinfoUrl(config: KeycloakConfig): string {
  return `${config.url}/realms/${config.realm}/protocol/openid-connect/userinfo`;
}

function getLogoutUrl(config: KeycloakConfig): string {
  return `${config.url}/realms/${config.realm}/protocol/openid-connect/logout`;
}

const KEYCLOAK_TIMEOUT_MS = 10_000;

/** Fetch with AbortController timeout */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KEYCLOAK_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse a Keycloak error response into a descriptive message.
 */
async function parseKeycloakError(
  res: Response,
  context: string,
): Promise<string> {
  let detail: string;
  try {
    const text = await res.text();
    const json = JSON.parse(text) as {
      error_description?: string;
      error?: string;
    };
    detail = json.error_description ?? json.error ?? text;
  } catch {
    detail = `HTTP ${String(res.status)}`;
  }
  return `Keycloak ${context} failed (${String(res.status)}): ${detail}`;
}

/**
 * Login via Direct Access Grant (Resource Owner Password Credentials).
 * Requires "Direct access grants" enabled on the Keycloak client.
 */
export async function keycloakLogin(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const config = getConfig();
  const tokenUrl = getTokenUrl(config);

  const res = await fetchWithTimeout(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "password",
      username,
      password,
      scope: "openid",
    }),
  });

  if (!res.ok) {
    throw new Error(await parseKeycloakError(res, "login"));
  }

  return (await res.json()) as TokenResponse;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function keycloakRefresh(
  refreshToken: string,
): Promise<TokenResponse> {
  const config = getConfig();
  const tokenUrl = getTokenUrl(config);

  const res = await fetchWithTimeout(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseKeycloakError(res, "token refresh"));
  }

  return (await res.json()) as TokenResponse;
}

/**
 * Get user info from an access token via the Keycloak userinfo endpoint.
 */
export async function keycloakUserinfo(
  accessToken: string,
): Promise<Record<string, unknown>> {
  const config = getConfig();
  const userinfoUrl = getUserinfoUrl(config);

  const res = await fetchWithTimeout(userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(await parseKeycloakError(res, "userinfo"));
  }

  return (await res.json()) as Record<string, unknown>;
}

/**
 * Logout — invalidate the refresh token server-side.
 */
export async function keycloakLogout(refreshToken: string): Promise<void> {
  const config = getConfig();
  const logoutUrl = getLogoutUrl(config);

  const res = await fetchWithTimeout(logoutUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseKeycloakError(res, "logout"));
  }
}
