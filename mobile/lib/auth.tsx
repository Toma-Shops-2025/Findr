import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearSession,
  loadSession,
  saveSession,
  type AuthSession,
  type AuthUser,
} from '@/lib/session';

/**
 * AuthProvider must not pull heavy native modules (expo-file-system via api.ts)
 * at module eval time. apiFetch is required lazily inside signup/login/logout
 * and the optional /auth/me refresh after SecureStore restore.
 */
async function apiFetchLazy<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { apiFetch } = await import('@/lib/api');
  return apiFetch<T>(path, options);
}

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

/** Cap session restore so hung SecureStore /auth/me cannot block first paint. */
const AUTH_BOOT_TIMEOUT_MS = 3000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let finished = false;

    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      setReady(true);
    };

    const timer = setTimeout(() => {
      console.warn(
        `Findr auth boot timed out after ${AUTH_BOOT_TIMEOUT_MS}ms; continuing without restored session`,
      );
      finish();
    }, AUTH_BOOT_TIMEOUT_MS);

    (async () => {
      try {
        const stored = await loadSession();
        if (cancelled) return;
        if (!stored) {
          finish();
          return;
        }
        try {
          const me = await apiFetchLazy<{ user: AuthUser }>('/auth/me', {
            token: stored.accessToken,
          });
          const next = { accessToken: stored.accessToken, user: me.user };
          await saveSession(next);
          if (!cancelled) setSession(next);
        } catch {
          await clearSession();
          if (!cancelled) setSession(null);
        }
      } catch (err) {
        console.warn('Findr auth boot failed; continuing logged out', err);
        if (!cancelled) setSession(null);
      } finally {
        clearTimeout(timer);
        finish();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const data = await apiFetchLazy<AuthSession>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await saveSession(data);
    setSession(data);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const data = await apiFetchLazy<AuthSession>('/auth/login', {
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
        await apiFetchLazy('/auth/logout', { method: 'POST', token });
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
