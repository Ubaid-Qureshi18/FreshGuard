import React, { createContext, useContext } from 'react';

// ── Hardcoded guest user — no login required ───────────────
const GUEST_USER = { id: 'guest-user-001', email: 'user@freshguard.app' };
const GUEST_SESSION = {
  access_token: `dev_token_${Date.now()}_user%40freshguard.app`,
  refresh_token: 'guest_refresh',
  expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
  user: GUEST_USER,
};

interface AuthContextValue {
  user: { id: string; email: string };
  session: typeof GUEST_SESSION;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const logout = () => {
    // No-op: app works without login
  };

  return (
    <AuthContext.Provider value={{ user: GUEST_USER, session: GUEST_SESSION, loading: false, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
