import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_STORAGE_KEY = "@step_ritual_auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("EXPO_PUBLIC_API_URL is not set (see .env.example)");
  }
  return url.replace(/\/+$/, "");
}

async function getAuthToken(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? (JSON.parse(stored).token ?? null) : null;
  } catch {
    return null;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let code: string | undefined;
  let message = `Errore ${res.status}`;
  try {
    const body = await res.json();
    code = body.error;
    message = body.message || body.error || message;
  } catch {
    // Non-JSON error body: keep the generic message.
  }
  return new ApiError(res.status, code, message);
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown,
): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (data !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${route}`, {
      method,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Connessione assente. Controlla internet e riprova.",
    );
  }

  if (!res.ok) {
    throw await toApiError(res);
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await apiRequest("GET", queryKey.join("/"));
      return await res.json();
    } catch (error) {
      if (
        unauthorizedBehavior === "returnNull" &&
        error instanceof ApiError &&
        error.status === 401
      ) {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
