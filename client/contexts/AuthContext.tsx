import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl, queryClient } from "@/lib/query-client";

interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  coupleId: string | null;
}

interface Couple {
  id: string;
  ritualCode: string | null;
  status: string;
  createdByUserId: string | null;
  expiresAt: string | null;
  totalKm: number;
  currentStreak: number;
  lastWalkDate: string | null;
}

interface Partner {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  couple: Couple | null;
  partner: Partner | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  createCouple: () => Promise<string>;
  joinCouple: (ritualCode: string) => Promise<void>;
  unpairCouple: () => Promise<void>;
  regenerateInvite: () => Promise<string>;
  cancelInvite: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@step_ritual_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      const data = await response.json();
      setUser(data.user);
      setCouple(data.couple);
      setPartner(data.partner);
    } catch (error) {
      setUser(null);
      setCouple(null);
      setPartner(null);
    }
  };

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          await fetchUserData();
        }
      } catch (error) {
        console.error("Error loading auth:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await response.json();
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: data.token }));
    setUser(data.user);
    setCouple(data.couple);
    setPartner(data.partner);
    queryClient.invalidateQueries();
  };

  const register = async (email: string, password: string, nickname: string) => {
    const response = await apiRequest("POST", "/api/auth/register", { email, password, nickname });
    const data = await response.json();
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: data.token }));
    setUser(data.user);
    setCouple(null);
    setPartner(null);
    queryClient.invalidateQueries();
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setCouple(null);
    setPartner(null);
    queryClient.clear();
  };

  const createCouple = async (): Promise<string> => {
    const response = await apiRequest("POST", "/api/couple/generate");
    const data = await response.json();
    if (data.error) {
      throw new Error(data.message || data.error);
    }
    await fetchUserData();
    return data.invite_code;
  };

  const joinCouple = async (ritualCode: string) => {
    const response = await apiRequest("POST", "/api/couple/join", { ritualCode });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.message || data.error);
    }
    setPartner(data.partner);
    await fetchUserData();
  };

  const unpairCouple = async () => {
    const response = await apiRequest("POST", "/api/couple/unpair");
    const data = await response.json();
    if (data.error) {
      throw new Error(data.message || data.error);
    }
    setCouple(null);
    setPartner(null);
    queryClient.invalidateQueries();
    await fetchUserData();
  };

  const regenerateInvite = async (): Promise<string> => {
    const response = await apiRequest("POST", "/api/couple/regenerate");
    const data = await response.json();
    if (data.error) {
      throw new Error(data.message || data.error);
    }
    await fetchUserData();
    return data.invite_code;
  };

  const cancelInvite = async () => {
    const response = await apiRequest("POST", "/api/couple/cancel-invite");
    const data = await response.json();
    if (data.error) {
      throw new Error(data.message || data.error);
    }
    setCouple(null);
    setPartner(null);
    queryClient.invalidateQueries();
    await fetchUserData();
  };

  const refreshUser = async () => {
    await fetchUserData();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        couple,
        partner,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
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
