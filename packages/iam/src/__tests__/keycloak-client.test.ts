import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env vars before import
process.env["KEYCLOAK_URL"] = "http://localhost:8180";
process.env["KEYCLOAK_REALM"] = "test-realm";
process.env["KEYCLOAK_CLIENT_ID"] = "test-client";
process.env["KEYCLOAK_CLIENT_SECRET"] = "test-secret";

const { keycloakLogin, keycloakRefresh, keycloakUserinfo, keycloakLogout } = await import("../keycloak-client.js");

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
    headers: new Headers(),
  } as Response;
}

describe("keycloakLogin", () => {
  beforeEach(() => mockFetch.mockReset());

  it("should return tokens on successful login", async () => {
    const tokens = { access_token: "at-123", refresh_token: "rt-456", expires_in: 300, token_type: "Bearer" };
    mockFetch.mockResolvedValueOnce(mockResponse(200, tokens));

    const result = await keycloakLogin("user@test.com", "password123");
    expect(result.access_token).toBe("at-123");
    expect(result.refresh_token).toBe("rt-456");

    // Verify correct URL was called
    const callUrl = mockFetch.mock.calls[0]![0] as string;
    expect(callUrl).toContain("/realms/test-realm/protocol/openid-connect/token");
  });

  it("should throw on invalid credentials", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401, { error: "invalid_grant", error_description: "Invalid user credentials" }));

    await expect(keycloakLogin("bad@test.com", "wrong")).rejects.toThrow("Keycloak login failed (401)");
  });

  it("should include client credentials in request body", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { access_token: "at", refresh_token: "rt", expires_in: 300, token_type: "Bearer" }));

    await keycloakLogin("user@test.com", "pass");

    const body = mockFetch.mock.calls[0]![1]?.body as URLSearchParams;
    expect(body.get("client_id")).toBe("test-client");
    expect(body.get("client_secret")).toBe("test-secret");
    expect(body.get("grant_type")).toBe("password");
    expect(body.get("username")).toBe("user@test.com");
  });
});

describe("keycloakRefresh", () => {
  beforeEach(() => mockFetch.mockReset());

  it("should refresh tokens", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { access_token: "new-at", refresh_token: "new-rt", expires_in: 300, token_type: "Bearer" }));

    const result = await keycloakRefresh("old-rt");
    expect(result.access_token).toBe("new-at");
  });

  it("should throw on expired refresh token", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(400, { error: "invalid_grant" }));
    await expect(keycloakRefresh("expired-rt")).rejects.toThrow("Keycloak token refresh failed");
  });
});

describe("keycloakUserinfo", () => {
  beforeEach(() => mockFetch.mockReset());

  it("should return user info", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { sub: "user-123", email: "test@test.com", given_name: "Test" }));

    const info = await keycloakUserinfo("valid-token");
    expect(info["sub"]).toBe("user-123");
    expect(info["email"]).toBe("test@test.com");
  });

  it("should pass Bearer token in Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { sub: "123" }));

    await keycloakUserinfo("my-token");

    const headers = mockFetch.mock.calls[0]![1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-token");
  });

  it("should throw on invalid token", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(401, { error: "invalid_token" }));
    await expect(keycloakUserinfo("bad-token")).rejects.toThrow("Keycloak userinfo failed");
  });
});

describe("keycloakLogout", () => {
  beforeEach(() => mockFetch.mockReset());

  it("should logout successfully", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(204, ""));
    await expect(keycloakLogout("rt-token")).resolves.toBeUndefined();
  });

  it("should throw on failure", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(400, { error: "invalid_grant" }));
    await expect(keycloakLogout("bad-rt")).rejects.toThrow("Keycloak logout failed");
  });
});
