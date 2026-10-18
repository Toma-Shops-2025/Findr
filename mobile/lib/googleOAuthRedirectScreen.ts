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
  endOAuthLogin,
  endOAuthResolve,
  tryBeginOAuthLogin,
  tryBeginOAuthResolve,
} from '@/lib/googleOAuthFinishLocks';

/** Only for code exchange + cold Render wake — API login is usually <1s. */
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

function isLoggedIn(accessTokenRef: React.RefObject<string | null>): boolean {
  return Boolean(accessTokenRef.current);
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
  const [statusLine, setStatusLine] = useState('Finishing Google sign-in…');

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
    if (!accessToken) return;
    succeededRef.current = true;
    clearBail();
    goToNearby();
  }, [accessToken]);

  useEffect(() => {
    if (GOOGLE_AUTH_DISABLED || succeededRef.current || accessToken) return;

    armBail();

    if (!tryBeginOAuthResolve()) return;

    let cancelled = false;

    void (async () => {
      setStatusLine('Finishing Google sign-in…');

      let token = idTokenFromGoogleResponse(response);

      const codeFromParams = paramCode(params as Record<string, unknown>);
      const builtUrl = googleOAuthReturnUrlFromRouteParams(
        params as Record<string, unknown>,
      );
      const linkUrl = await readGoogleOAuthReturnUrl();
      const returnUrl = builtUrl ?? linkUrl ?? (await Linking.getInitialURL());

      if (!token && codeFromParams) {
        setStatusLine('Completing sign-in with Google…');
        token = await exchangeGoogleIdTokenFromAuthCode(codeFromParams);
      }

      if (!token && returnUrl && extractOAuthAuthCode(returnUrl)) {
        setStatusLine('Completing sign-in with Google…');
        token = await exchangeGoogleIdTokenFromUrl(returnUrl);
      }

      endOAuthResolve();

      if (cancelled) return;

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

      if (!tryBeginOAuthLogin()) return;

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
    })();

    return () => {
      cancelled = true;
      endOAuthResolve();
    };
  }, [loginWithGoogle, params, pathname, response, accessToken]);

  useEffect(() => () => clearBail(), []);

  return statusLine;
}
