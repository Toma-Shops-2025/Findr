import * as Linking from 'expo-linking';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { idTokenFromGoogleResponse } from '@/lib/googleAuth';
import {
  googleAuthErrorMessage,
  setLastGoogleAuthError,
} from '@/lib/googleAuthErrors';
import { useGoogleAuthSession } from '@/lib/googleAuthContext';
import { useAuth } from '@/lib/auth';
import { GOOGLE_AUTH_DISABLED } from '@/lib/authUi';
import {
  clearPendingGoogleOAuth,
  exchangeGoogleIdTokenFromAuthCode,
  exchangeGoogleIdTokenFromUrl,
  extractOAuthAuthCode,
  googleOAuthReturnUrlFromRouteParams,
  loadPendingGoogleOAuth,
  readGoogleOAuthReturnUrl,
} from '@/lib/googleOAuthRecovery';
import {
  acquireOAuthLogin,
  acquireOAuthResolve,
  endOAuthLogin,
  endOAuthResolve,
  resetGoogleOAuthFinishLocks,
} from '@/lib/googleOAuthFinishLocks';

const REDIRECT_FINISH_MS = 45_000;

function paramCode(params: Record<string, unknown>): string | null {
  const raw = params.code;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function goToNearby(): void {
  setLastGoogleAuthError(null);
  router.replace('/(tabs)/nearby');
}

function isLoggedIn(accessTokenRef: { current: string | null }): boolean {
  return Boolean(accessTokenRef.current);
}

async function exchangeAuthCodeWithPendingRetry(
  code: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const token = await exchangeGoogleIdTokenFromAuthCode(code);
    if (token) return token;
    await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
  }
  return null;
}

async function exchangeUrlWithPendingRetry(
  url: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const token = await exchangeGoogleIdTokenFromUrl(url);
    if (token) return token;
    await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
  }
  return null;
}

/**
 * Dedicated finisher for /oauth2redirect and /oauthredirect — single-flight,
 * shared locks with root handler, declarative Redirect when session is set.
 */
export function useGoogleOAuthRedirectScreen() {
  const { loginWithGoogle, accessToken } = useAuth();
  const { response } = useGoogleAuthSession();
  const params = useGlobalSearchParams();
  const pathname = usePathname();
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const succeededRef = useRef(false);
  const bailRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishRunRef = useRef(0);
  const [statusLine, setStatusLine] = useState('Finishing Google sign-in…');
  const linkUrl = Linking.useURL();

  const clearBail = () => {
    if (bailRef.current) {
      clearTimeout(bailRef.current);
      bailRef.current = null;
    }
  };

  const armBail = () => {
    if (bailRef.current || succeededRef.current) return;
    bailRef.current = setTimeout(() => {
      bailRef.current = null;
      if (succeededRef.current || isLoggedIn(accessTokenRef)) {
        goToNearby();
        return;
      }
      setLastGoogleAuthError(
        'Google sign-in timed out. Try again or use email login.',
      );
      void clearPendingGoogleOAuth();
      router.replace('/(auth)/login');
    }, REDIRECT_FINISH_MS);
  };

  useEffect(() => {
    if (GOOGLE_AUTH_DISABLED) {
      router.replace('/(auth)/login');
    }
  }, []);

  useEffect(() => {
    const code = paramCode(params as Record<string, unknown>);
    if (code) {
      // Login-screen root handler may leave locks set when we land here from Chrome.
      resetGoogleOAuthFinishLocks();
    }
  }, [params]);

  useEffect(() => {
    if (!accessToken) return;
    succeededRef.current = true;
    clearBail();
    goToNearby();
  }, [accessToken]);

  useEffect(() => {
    if (GOOGLE_AUTH_DISABLED || succeededRef.current || accessToken) return;

    armBail();
    const runId = ++finishRunRef.current;
    let cancelled = false;

    void (async () => {
      if (!(await acquireOAuthResolve())) {
        if (isLoggedIn(accessTokenRef)) {
          goToNearby();
        }
        return;
      }

      try {
        setStatusLine('Finishing Google sign-in…');

        let token = idTokenFromGoogleResponse(response);

        const codeFromParams = paramCode(params as Record<string, unknown>);
        const builtUrl = googleOAuthReturnUrlFromRouteParams(
          params as Record<string, unknown>,
        );
        const storedReturnUrl = await readGoogleOAuthReturnUrl();
        const returnUrl =
          builtUrl ?? linkUrl ?? storedReturnUrl ?? (await Linking.getInitialURL());

        if (!token && codeFromParams) {
          setStatusLine('Completing sign-in with Google…');
          token = await exchangeAuthCodeWithPendingRetry(codeFromParams);
        }

        if (!token && returnUrl && extractOAuthAuthCode(returnUrl)) {
          setStatusLine('Completing sign-in with Google…');
          token = await exchangeUrlWithPendingRetry(returnUrl);
        }

        if (cancelled || runId !== finishRunRef.current) return;

        if (!token) {
          if (isLoggedIn(accessTokenRef)) {
            succeededRef.current = true;
            clearBail();
            goToNearby();
            return;
          }
          const pending = await loadPendingGoogleOAuth();
          setLastGoogleAuthError(
            pending
              ? `Google sign-in could not be finished (${pathname}). Try again or use email.`
              : 'Google sign-in session was lost after Google. Close the app fully and try again.',
          );
          void clearPendingGoogleOAuth();
          clearBail();
          router.replace('/(auth)/login');
          return;
        }

        if (!(await acquireOAuthLogin())) {
          if (isLoggedIn(accessTokenRef)) {
            succeededRef.current = true;
            clearBail();
            goToNearby();
          }
          return;
        }

        setStatusLine('Signing you in…');
        try {
          await loginWithGoogle(token);
          succeededRef.current = true;
          clearBail();
          void clearPendingGoogleOAuth();
          goToNearby();
        } catch (err) {
          if (isLoggedIn(accessTokenRef)) {
            succeededRef.current = true;
            clearBail();
            goToNearby();
            return;
          }
          setLastGoogleAuthError(googleAuthErrorMessage(err));
          clearBail();
          router.replace('/(auth)/login');
        } finally {
          endOAuthLogin();
        }
      } finally {
        endOAuthResolve();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, params, pathname, response, accessToken, linkUrl]);

  useEffect(() => () => clearBail(), []);

  return statusLine;
}
