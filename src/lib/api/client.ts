// ============================================================================
// ReguFlow - API client (browser → Express backend)
// ----------------------------------------------------------------------------
// KEAMANAN:
// - Access token disimpan di memory + localStorage (short-lived, 15m).
// - Refresh token di httpOnly cookie (tidak bisa dibaca JS).
// - credentials: "include" WAJIB agar cookie terkirim.
// - Auto-refresh sekali saat mendapat 401, lalu retry.
// ============================================================================

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000";

const ACCESS_TOKEN_KEY = "reguflow.accessToken";

let accessToken: string | null = readAccessToken();
let refreshPromise: Promise<string | null> | null = null;

function readAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeAccessToken(token: string | null): void {
  accessToken = token;
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* storage tidak tersedia (incognito) — abaikan */
  }
}

export function setAccessToken(token: string | null): void {
  writeAccessToken(token);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Lewati auto-refresh (dipakai oleh endpoint refresh sendiri). */
  skipRefresh?: boolean;
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...((headers as Record<string, string>) ?? {}),
  };

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const doFetch = async (token: string | null): Promise<Response> => {
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: payload,
      credentials: "include",
    });
  };

  let response = await doFetch(accessToken);

  // Auto-refresh sekali jika 401
  if (response.status === 401 && !skipRefresh && !refreshPromise) {
    refreshPromise = refreshAccessToken();
    const newToken = await refreshPromise;
    refreshPromise = null;
    if (newToken) {
      response = await doFetch(newToken);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.error ?? `Permintaan gagal (${response.status}). Coba lagi.`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const result = await request<{ access_token: string }>(
      "/api/auth/refresh",
      { method: "POST", skipRefresh: true }
    );
    writeAccessToken(result.access_token);
    return result.access_token;
  } catch {
    writeAccessToken(null);
    return null;
  }
}

// ---- Helper HTTP verbs ------------------------------------------------------

export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),

  /** URL absolut untuk resource (mis. download file). */
  url: (path: string) => `${API_URL}${path}`,
};

export { API_URL };
