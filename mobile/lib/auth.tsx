import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiFetch } from '@/lib/api';
import {
  clearSession,
  loadSession,
  saveSession,
  type AuthSession,
  type AuthUser,
} from '@/lib/session';

type SignupInput = {
  email: string;
  password: string;
  dateOfBirth: string;
  tosAccepted: true;
  privacyAccepted: true;
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  ready: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      if (!stored) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const me = await apiFetch<{ user: AuthUser }>('/auth/me', {
          token: stored.accessToken,
        });
        const next = { accessToken: stored.accessToken, user: me.user };
        await saveSession(next);
        if (!cancelled) setSession(next);
      } catch {
        await clearSession();
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const data = await apiFetch<AuthSession>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await saveSession(data);
    setSession(data);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const data = await apiFetch<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await saveSession(data);
    setSession(data);
  }, []);

  const logout = useCallback(async () => {
    const token = session?.accessToken;
    try {
      if (token) {
        await apiFetch('/auth/logout', { method: 'POST', token });
      }
    } catch {
      // Client still clears local session.
    }
    await clearSession();
    setSession(null);
  }, [session?.accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      ready,
      signup,
      login,
      logout,
    }),
    [session, ready, signup, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
