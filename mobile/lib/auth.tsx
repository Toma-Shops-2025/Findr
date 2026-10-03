import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { InteractionManager } from 'react-native';

import {
  clearSession,
  loadSession,
  saveSession,
  type AuthSession,
  type AuthUser,
} from '@/lib/session';

/**
 * SAFE MODE auth:
 * - Never import @/lib/api at module top-level (expo-file-system is heavy).
 * - Restore SecureStore session only, mark ready, let first paint happen.
 * - Defer /auth/me until after interactions / first paint.
 * - Never throw out of boot; timeouts cannot block the tree.
 */
async function apiFetchLazy<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  try {
    const { apiFetch } = await import('@/lib/api');
    return apiFetch<T>(path, options);
  } catch (err) {
    const wrapped = err instanceof Error ? err : new Error(String(err));
    throw wrapped;
  }
}

function waitForFirstPaint(): Promise<void> {
  return new Promise((resolve) => {
    // After interactions + one macrotask so BootFallback / Redirect can paint.
    const handle = InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, 0);
    });
    // InteractionManager handle may be a cancellable object; ignore cancel path.
    void handle;
  });
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

/** Cap SecureStore restore so hung native storage cannot block first paint. */
const AUTH_BOOT_TIMEOUT_MS = 2500;

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
      let stored: AuthSession | null = null;
      try {
        stored = await loadSession();
        if (!cancelled && stored) setSession(stored);
      } catch (err) {
        console.warn('Findr auth boot failed; continuing logged out', err);
        if (!cancelled) setSession(null);
      } finally {
        // First paint: ready after SecureStore only - before any network.
        clearTimeout(timer);
        finish();
      }

      if (cancelled || !stored) return;

      try {
        await waitForFirstPaint();
      } catch {
        // ignore
      }
      if (cancelled) return;

      try {
        const me = await apiFetchLazy<{ user: AuthUser }>('/auth/me', {
          token: stored.accessToken,
        });
        const next = { accessToken: stored.accessToken, user: me.user };
        await saveSession(next);
        if (!cancelled) setSession(next);
      } catch {
        try {
          await clearSession();
        } catch {
          // ignore
        }
        if (!cancelled) setSession(null);
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