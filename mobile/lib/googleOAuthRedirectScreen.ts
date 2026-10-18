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
import {
  clearAbandonedGoogleOAuthReturn,
  clearPendingGoogleOAuth,
  exchangeGoogleIdTokenFromAuthCode,
  exchangeGoogleIdTokenFromUrl,
  extractOAuthAuthCode,
  googleOAuthReturnUrlFromRouteParams,
  loadPendingGoogleOAuth,
  readGoogleOAuthReturnUrl,
} from '@/lib/googleOAuthRecovery';
import { resetGoogleOAuthFinishLocks } from '@/lib/googleOAuthFinishLocks';

const REDIRECT_FINISH_MS = 20_000;

function paramCode(params: Record<string, unknown>): string | null {
  const raw = params.code;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

/**
 * Dedicated finisher for /oauth2redirect and /oauthredirect — no shared
 * "abandoned URL" dead-ends, guaranteed timeout back to login.
 */
export function useGoogleOAuthRedirectScreen() {
  const { loginWithGoogle, accessToken } = useAuth();
  const { response } = useGoogleAuthSession();
  const params = useGlobalSearchParams();
  const pathname = usePathname();
  const runRef = useRef(false);
  const [statusLine, setStatusLine] = useState('Finishing Google sign-in…');

  useEffect(() => {
    resetGoogleOAuthFinishLocks();
    clearAbandonedGoogleOAuthReturn();
  }, []);

  useEffect(() => {
    if (accessToken) {
      router.replace('/(tabs)/nearby');
      return;
    }

    const bail = setTimeout(() => {
      setLastGoogleAuthError(
        'Google sign-in timed out. Try again or use email login.',
      );
      void clearPendingGoogleOAuth();
      router.replace('/(auth)/login');
    }, REDIRECT_FINISH_MS);

    if (runRef.current) {
      return () => clearTimeout(bail);
    }
    runRef.current = true;

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

      if (!token) {
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

      setStatusLine('Signing you in…');
      try {
        await loginWithGoogle(token);
        router.replace('/(tabs)/nearby');
      } catch (err) {
        setLastGoogleAuthError(googleAuthErrorMessage(err));
        router.replace('/(auth)/login');
      }
    })();

    return () => {
      clearTimeout(bail);
      runRef.current = false;
    };
  }, [accessToken, loginWithGoogle, params, pathname, response]);

  return statusLine;
}
