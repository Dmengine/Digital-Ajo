import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PublicUser } from "../types/auth";
import { setApiToken } from "../api/client";
import { me } from "../api/auth.api";

const TOKEN_KEY = "ajo.mobile.token";
const USER_KEY = "ajo.mobile.user";

type AuthContextValue = {
  token: string | null;
  user: PublicUser | null;
  loading: boolean;
  login: (nextToken: string, nextUser: PublicUser) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (savedToken) {
          setToken(savedToken);
          setApiToken(savedToken);
        }
        if (savedUser) {
          setUser(JSON.parse(savedUser) as PublicUser);
        }
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  // Keep these functions stable: screens use them as effect dependencies, so recreating
  // them on every user update would re-trigger those effects in an endless refresh loop.
  const login = useCallback(async (nextToken: string, nextUser: PublicUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setApiToken(nextToken);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, nextToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setApiToken(null);
    await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const profile = await me();
    setUser(profile.user);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile.user));
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, loading, login, logout, refreshProfile }),
    [token, user, loading, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
