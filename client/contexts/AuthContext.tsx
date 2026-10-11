import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  apiRequest,
  ApiError,
  AUTH_STORAGE_KEY,
  queryClient,
} from "@/lib/query-client";
import { clearScheduledNotifications } from "@/lib/notifications";
import { trackingService } from "@/lib/tracking";

interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  coupleId: string | null;
}

export interface Couple {
  id: string;
  ritualCode: string | null;
  status: string;
  createdByUserId: string | null;
  expiresAt: string | null;
  totalKm: number;
  currentStreak: number;
  bestStreak: number;
  lastWalkDate: string | null;
  lastWalkLocalDate: string | null;
}

interface Partner {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

interface Session {
  user: User;
  couple: Couple | null;
  partner: Partner | null;
}

interface StoredAuth {
  token: string;
  session?: Session;
}

interface AuthContextType {
  user: User | null;
  couple: Couple | null;
  partner: Partner | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  resetPassword: (
    email: string,
    code: string,
    password: string,
  ) => Promise<void>;
  createCouple: () => Promise<string>;
  joinCouple: (ritualCode: string) => Promise<void>;
  unpairCouple: () => Promise<void>;
  regenerateInvite: () => Promise<string>;
  cancelInvite: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function readStoredAuth(): Promise<StoredAuth | null> {
  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
    queryClient.clear();
    await Promise.all([
      clearScheduledNotifications(),
      trackingService.clear().catch(() => {}),
    ]);
  }, []);

  const saveSession = useCallback(async (next: Session, token?: string) => {
    const stored = await readStoredAuth();
    const nextToken = token ?? stored?.token;
    if (nextToken) {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ token: nextToken, session: next }),
      );
    }
    setSession(next);
  }, []);

  // Only an explicit 401 logs the user out; network errors keep the cached session.
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      await saveSession(await response.json());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearAuth();
        return;
      }
      throw error;
    }
  }, [saveSession, clearAuth]);

  useEffect(() => {
    const loadAuth = async () => {
      const stored = await readStoredAuth();
      if (!stored?.token) {
        setIsLoading(false);
        return;
      }

      if (stored.session) {
        setSession(stored.session);
        setIsLoading(false);
        refreshUser().catch(() => {});
        return;
      }

      try {
        await refreshUser();
      } catch (error) {
        console.error("Error loading auth:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", {
      email,
      password,
    });
    const { token, ...next } = await response.json();
    await saveSession(next, token);
    queryClient.invalidateQueries();
  };

  const register = async (
    email: string,
    password: string,
    nickname: string,
  ) => {
    const response = await apiRequest("POST", "/api/auth/register", {
      email,
      password,
      nickname,
    });
    const { token, ...next } = await response.json();
    await saveSession(next, token);
    queryClient.invalidateQueries();
  };

  const resetPassword = async (
    email: string,
    code: string,
    password: string,
  ) => {
    const response = await apiRequest("POST", "/api/auth/reset-password", {
      email,
      code,
      password,
    });
    const { token, ...next } = await response.json();
    await saveSession(next, token);
    queryClient.invalidateQueries();
  };

  // Stop partner alerts on this device before forgetting the session.
  const logout = async () => {
    await apiRequest("PUT", "/api/notification-prefs", {
      pushToken: null,
    }).catch(() => {});
    await clearAuth();
  };

  const deleteAccount = async (password: string) => {
    await apiRequest("POST", "/api/auth/delete-account", { password });
    await clearAuth();
  };

  const createCouple = async (): Promise<string> => {
    const response = await apiRequest("POST", "/api/couple/generate");
    const data = await response.json();
    await refreshUser();
    return data.invite_code;
  };

  const joinCouple = async (ritualCode: string) => {
    await apiRequest("POST", "/api/couple/join", { ritualCode });
    await refreshUser();
    queryClient.invalidateQueries();
  };

  const unpairCouple = async () => {
    await apiRequest("POST", "/api/couple/unpair");
    await refreshUser();
    queryClient.invalidateQueries();
  };

  const regenerateInvite = async (): Promise<string> => {
    const response = await apiRequest("POST", "/api/couple/regenerate");
    const data = await response.json();
    await refreshUser();
    return data.invite_code;
  };

  const cancelInvite = async () => {
    await apiRequest("POST", "/api/couple/cancel-invite");
    await refreshUser();
    queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        couple: session?.couple ?? null,
        partner: session?.partner ?? null,
        isLoading,
        isAuthenticated: !!session?.user,
        login,
        register,
        logout,
        deleteAccount,
        resetPassword,
        createCouple,
        joinCouple,
        unpairCouple,
        regenerateInvite,
        cancelInvite,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
