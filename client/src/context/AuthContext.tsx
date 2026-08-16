import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi, getSession, setSession, clearSession } from '../services/api';
import type { StoredSession } from '../services/api';

interface AuthUser { id: string; email: string; }
interface AuthContextValue {
  user: AuthUser | null;
  session: StoredSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<{ requiresConfirmation: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getSession();
    if (stored) {
      // Check not expired
      if (stored.expires_at && Date.now() / 1000 < stored.expires_at) {
        setSessionState(stored);
      } else {
        clearSession();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const newSession: StoredSession = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: { id: data.user.id, email: data.user.email },
    };
    setSession(newSession);
    setSessionState(newSession);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const { data } = await authApi.register(email, password, name);
    if (data.session) {
      const newSession: StoredSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: { id: data.user.id, email: data.user.email },
      };
      setSession(newSession);
      setSessionState(newSession);
      return { requiresConfirmation: false };
    }
    return { requiresConfirmation: true };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  const user = session?.user || null;

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
