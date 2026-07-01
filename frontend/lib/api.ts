import { ApiErrorResponse, RequestOptions } from "../types/api";

/**
 * Custom API client for DocIntel backend.
 * Storing the token in memory is the most secure way to prevent XSS attacks.
 */

let inMemoryToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const nativeFetch = globalThis.fetch;

export function setAccessToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

export class ApiError extends Error {
  response: ApiErrorResponse;

  constructor(response: ApiErrorResponse) {
    super(response.message || response.error || "API Error");
    this.name = "ApiError";
    this.response = response;
  }
}

/**
 * Core request caller with generics and strict typings.
 */
async function makeRequest<TResponse, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  // 1. Build URL with query params
  let url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // 2. Set headers
  const headers = new Headers();

  if (options.headers) {
    Object.entries(options.headers).forEach(([key, val]) => {
      headers.set(key, val);
    });
  }

  if (
    !headers.has("Content-Type") &&
    options.body !== undefined &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  // 3. Inject Bearer token if present
  if (inMemoryToken) {
    headers.set("Authorization", `Bearer ${inMemoryToken}`);
  }

  const fetchOptions: RequestInit = {
    method: options.method || "GET",
    headers,
    credentials: "include", // Crucial for HttpOnly cookies (refreshToken)
  };

  if (options.body !== undefined) {
    fetchOptions.body =
      options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body);
  }

  try {
    let response = await nativeFetch(url, fetchOptions);

    // If unauthorized, and we have a path to refresh the token, try refreshing
    const isAuthRoute =
      path.startsWith("/auth/login") ||
      path.startsWith("/auth/register") ||
      path.startsWith("/auth/refresh");
    if (response.status === 401 && !isAuthRoute) {
      try {
        const newAccessToken = await handleTokenRefresh();
        if (newAccessToken) {
          // Retry the request with the new token
          headers.set("Authorization", `Bearer ${newAccessToken}`);
          response = await nativeFetch(url, { ...fetchOptions, headers });
        }
      } catch (refreshErr) {
        setAccessToken(null);
        throw refreshErr;
      }
    }

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: ApiErrorResponse;
      try {
        errorData = (await response.json()) as ApiErrorResponse;
      } catch {
        errorData = {
          status: response.status,
          error: response.statusText,
          message: "Ocorreu um erro inesperado",
          path,
          timestamp: new Date().toISOString(),
        };
      }
      throw new ApiError(errorData);
    }

    // Check content type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as TResponse;
    }

    return null as unknown as TResponse; // Empty body (e.g. 204 or logout)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(error instanceof Error ? error.message : "Erro de rede");
  }
}

/**
 * Handle refreshing the access token. If multiple requests fail simultaneously,
 * it merges them so only one refresh call is made.
 */
async function handleTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await nativeFetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar o token");
      }

      const data = (await response.json()) as { accessToken: string };
      const newAccessToken = data.accessToken;
      setAccessToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Custom API client with namespaces and strict generic typing.
 * Uses: fetch.internal.auth('/login', { method: 'POST', body: ... })
 */
export const fetchClient = {
  internal: {
    auth: <TResponse, TBody = unknown>(
      path: string,
      options: RequestOptions<TBody> = {},
    ): Promise<TResponse> => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return makeRequest<TResponse, TBody>(`/auth${normalizedPath}`, options);
    },
    user: <TResponse, TBody = unknown>(
      path: string,
      options: RequestOptions<TBody> = {},
    ): Promise<TResponse> => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return makeRequest<TResponse, TBody>(`/user${normalizedPath}`, options);
    },
    request: <TResponse, TBody = unknown>(
      path: string,
      options: RequestOptions<TBody> = {},
    ): Promise<TResponse> => {
      return makeRequest<TResponse, TBody>(path, options);
    },
  },
};
