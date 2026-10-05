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
 * Auth with remember-me:
 * - Persist JWT + user via session.ts (expo-secure-store on device).
 * - Restore SecureStore first, mark ready, then paint.
 * - Defer /auth/me until after first paint.
 * - Only clear stored session on 401/403 from /auth/me (not network blips).
 * - Never import @/lib/api at module top-level (expo-file-system is heavy).
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
    const handle = InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, 0);
    });
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
  /** Default true in UI — when false, session is not written to SecureStore. */
  staySignedIn?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  /** False until SecureStore restore finishes (or fails). */
  ready: boolean;
  /** Alias for !ready - used by app/index.tsx gate. */
  isLoading: boolean;
  signup: (input: SignupInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Warn-only; never mark ready early (that redirected to login before restore). */
const AUTH_BOOT_WARN_MS = 4000;

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
        `Findr auth boot still waiting after ${AUTH_BOOT_WARN_MS}ms (SecureStore)`,
      );
    }, AUTH_BOOT_WARN_MS);

    (async () => {
      let stored: AuthSession | null = null;
      try {
        stored = await loadSession();
        if (!cancelled && stored) setSession(stored);
      } catch (err) {
        console.warn('Findr auth boot failed; continuing logged out', err);
        if (!cancelled) setSession(null);
      } finally {
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
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        // Only wipe remember-me on hard auth failure. Keep JWT on network /
        // Render cold-start / 5xx so reopen still works offline briefly.
        if (status === 401 || status === 403) {
          try {
            await clearSession();
          } catch {
            // ignore
          }
          if (!cancelled) setSession(null);
        } else {
          console.warn(
            'Findr /auth/me refresh failed; keeping stored session',
            err,
          );
        }
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
    const { staySignedIn = true, email, password } = input;
    const data = await apiFetchLazy<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (staySignedIn) {
      await saveSession(data);
    } else {
      await clearSession();
      await saveSession(data, { persist: false });
    }
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
      isLoading: !ready,
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