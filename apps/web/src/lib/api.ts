const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function headers(token?: string): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

/**
 * Handle API response — if 401, redirect to login (session expired server-side).
 * This catches cases where the JWT is expired but the client hasn't detected it yet.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Session expired or token invalid — force redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login?error=SessionExpired";
    }
    throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
  }

  if (res.status === 403) {
    throw new ApiError(403, "Accès refusé. Vous n'avez pas les permissions requises.");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, `Erreur API (${res.status}): ${body}`);
  }

  // Handle empty responses (204 No Content, etc.)
  const text = await res.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: headers(token),
    cache: "no-store",
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(
  path: string,
  token?: string,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: headers(token),
  });
  return handleResponse<T>(res);
}

export { ApiError, API_URL };
