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

const REDIRECT_FINISH_MS = 25_000;

function paramCode(params: Record<string, unknown>): string | null {
  const raw = params.code;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function goToNearby(): void {
  router.replace('/(tabs)/nearby');
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
  const finishStartedRef = useRef(false);
  const succeededRef = useRef(false);
  const [statusLine, setStatusLine] = useState('Finishing Google sign-in…');

  useEffect(() => {
    if (GOOGLE_AUTH_DISABLED) {
      router.replace('/(auth)/login');
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      succeededRef.current = true;
      goToNearby();
    }
  }, [accessToken]);

  useEffect(() => {
    if (GOOGLE_AUTH_DISABLED || accessToken || succeededRef.current) return;

    const bail = setTimeout(() => {
      if (succeededRef.current) return;
      setLastGoogleAuthError(
        'Google sign-in timed out. Try again or use email login.',
      );
      void clearPendingGoogleOAuth();
      router.replace('/(auth)/login');
    }, REDIRECT_FINISH_MS);

    if (finishStartedRef.current) {
      return () => clearTimeout(bail);
    }
    finishStartedRef.current = true;

    void (async () => {
      if (!tryBeginOAuthResolve()) {
        finishStartedRef.current = false;
        return;
      }

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

      if (!token) {
        finishStartedRef.current = false;
        const pending = await loadPendingGoogleOAuth();
        setLastGoogleAuthError(
          pending
            ? `Google sign-in could not be finished (${pathname}). Try again or use email.`
            : 'Google sign-in session was lost after Google. Close the app fully and try again.',
        );
        void clearPendingGoogleOAuth();
        router.replace('/(auth)/login');
        return;
      }

      if (!tryBeginOAuthLogin()) {
        finishStartedRef.current = false;
        return;
      }

      setStatusLine('Signing you in…');
      try {
        await loginWithGoogle(token);
        succeededRef.current = true;
        void clearPendingGoogleOAuth();
        goToNearby();
      } catch (err) {
        finishStartedRef.current = false;
        setLastGoogleAuthError(googleAuthErrorMessage(err));
        router.replace('/(auth)/login');
      } finally {
        endOAuthLogin();
      }
    })();

    return () => clearTimeout(bail);
  }, [loginWithGoogle, params, pathname, response, accessToken]);

  return statusLine;
}
