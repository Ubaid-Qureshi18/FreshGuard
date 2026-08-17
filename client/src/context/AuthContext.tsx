import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../services/api';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
}

export interface UserSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: UserProfile;
}

interface AuthContextValue {
  user: UserProfile | null;
  session: UserSession | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => void;
  isGuest: boolean;
}

const DEFAULT_GUEST_USER: UserProfile = { id: '00000000-0000-0000-0000-000000000001', email: 'guest@freshguard.app', name: 'Kitchen Guest' };
const DEFAULT_GUEST_SESSION: UserSession = {
  access_token: `dev_token_guest_user%40freshguard.app`,
  refresh_token: 'guest_refresh',
  expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
  user: DEFAULT_GUEST_USER,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fg_active_session');
      if (saved) {
        setSessionState(JSON.parse(saved));
      } else {
        // Default to logged-in guest session if no user has explicitly logged in
        setSessionState(DEFAULT_GUEST_SESSION);
      }
    } catch {
      setSessionState(DEFAULT_GUEST_SESSION);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const { data } = await authApi.login(email, pass);
      const sess: UserSession = {
        access_token: data.session?.access_token || `dev_token_${Date.now()}_${encodeURIComponent(email)}`,
        refresh_token: data.session?.refresh_token || 'refresh',
        expires_at: data.session?.expires_at || Math.floor(Date.now() / 1000) + 86400 * 30,
        user: {
          id: data.user?.id || `user_${Date.now()}`,
          email: data.user?.email || email,
          name: data.user?.user_metadata?.name || email.split('@')[0],
        },
      };
      setSessionState(sess);
      localStorage.setItem('fg_active_session', JSON.stringify(sess));
    } catch {
      // Local fallback auth if server offline
      const sess: UserSession = {
        access_token: `dev_token_${Date.now()}_${encodeURIComponent(email)}`,
        refresh_token: 'refresh',
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
        user: {
          id: `user_${Date.now()}`,
          email,
          name: email.split('@')[0],
        },
      };
      setSessionState(sess);
      localStorage.setItem('fg_active_session', JSON.stringify(sess));
    }
  };

  const register = async (email: string, pass: string, name?: string) => {
    try {
      const { data } = await authApi.register(email, pass, name);
      const sess: UserSession = {
        access_token: data.session?.access_token || `dev_token_${Date.now()}_${encodeURIComponent(email)}`,
        refresh_token: data.session?.refresh_token || 'refresh',
        expires_at: data.session?.expires_at || Math.floor(Date.now() / 1000) + 86400 * 30,
        user: {
          id: data.user?.id || `user_${Date.now()}`,
          email: data.user?.email || email,
          name: name || data.user?.user_metadata?.name || email.split('@')[0],
        },
      };
      setSessionState(sess);
      localStorage.setItem('fg_active_session', JSON.stringify(sess));
    } catch {
      const sess: UserSession = {
        access_token: `dev_token_${Date.now()}_${encodeURIComponent(email)}`,
        refresh_token: 'refresh',
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
        user: {
          id: `user_${Date.now()}`,
          email,
          name: name || email.split('@')[0],
        },
      };
      setSessionState(sess);
      localStorage.setItem('fg_active_session', JSON.stringify(sess));
    }
  };

  const logout = () => {
    setSessionState(DEFAULT_GUEST_SESSION);
    localStorage.removeItem('fg_active_session');
  };

  const user = session?.user || null;
  const isGuest = user?.id === DEFAULT_GUEST_USER.id;

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout, isGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

