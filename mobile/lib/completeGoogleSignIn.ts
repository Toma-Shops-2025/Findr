import type { AuthSessionResult } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { idTokenFromGoogleResponse } from '@/lib/googleAuth';
import {
  googleAuthErrorMessage,
  setLastGoogleAuthError,
} from '@/lib/googleAuthErrors';
import { useGoogleAuthSession } from '@/lib/googleAuthContext';
import {
  clearPendingGoogleOAuth,
  exchangeGoogleIdTokenFromUrl,
  isAbandonedGoogleOAuthReturn,
  isGoogleOAuthReturnUrl,
  markGoogleOAuthReturnAbandoned,
  readGoogleOAuthReturnUrl,
} from '@/lib/googleOAuthRecovery';
import { useAuth } from '@/lib/auth';

/** Prevent duplicate API calls when root handler + oauth redirect screen both mount. */
let globalGoogleFinishInFlight = false;
let globalGoogleResolveInFlight = false;

const OAUTH_FINISH_TIMEOUT_MS = 45_000;

function idTokenFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const { params } = getQueryParams(url);
    const token = params.id_token;
    return typeof token === 'string' && token.length > 20 ? token : null;
  } catch {
    return null;
  }
}

function tokenFromAuthUrl(
  url: string | null,
  request: { parseReturnUrl: (u: string) => AuthSessionResult } | null,
): string | null {
  if (!url) return null;
  if (request) {
    try {
      const parsed = request.parseReturnUrl(url);
      const fromParsed = idTokenFromGoogleResponse(parsed);
      if (fromParsed) return fromParsed;
    } catch {
      // Fall through to raw query/hash parse.
    }
  }
  return idTokenFromUrl(url);
}

function oauthUrlHasAuthCode(url: string | null): boolean {
  if (!url) return false;
  try {
    const { params } = getQueryParams(url);
    const code = params.code;
    return typeof code === 'string' && code.length > 0;
  } catch {
    return false;
  }
}

async function resolveGoogleIdToken(
  response: AuthSessionResult | null,
  authReturnUrl: string | null,
  request: { parseReturnUrl: (u: string) => AuthSessionResult } | null,
): Promise<string | null> {
  const sync =
    idTokenFromGoogleResponse(response) ??
    tokenFromAuthUrl(authReturnUrl, request);
  if (sync) return sync;

  if (authReturnUrl && isGoogleOAuthReturnUrl(authReturnUrl)) {
    if (!oauthUrlHasAuthCode(authReturnUrl)) {
      return null;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const token = await exchangeGoogleIdTokenFromUrl(authReturnUrl);
      if (token) return token;
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
    return null;
  }
  return null;
}

/**
 * Finish Google OAuth after redirect (oauth2redirect / oauthredirect screens).
 * Also runs at app root for in-session returns when not on a dedicated redirect route.
 */
export function useCompleteGoogleSignIn(active = true) {
  const { loginWithGoogle, accessToken } = useAuth();
  const { response, request } = useGoogleAuthSession();
  const finishingRef = useRef(false);
  const pendingNavRef = useRef(false);
  const timedOutRef = useRef(false);
  const linkUrl = Linking.useURL();
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [coldStartOAuthUrl, setColdStartOAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    void Linking.getInitialURL().then((url) => {
      if (url) setInitialUrl(url);
    });
    void readGoogleOAuthReturnUrl().then((url) => {
      if (url) setColdStartOAuthUrl(url);
    });
  }, [active]);

  const authReturnUrl = linkUrl ?? initialUrl ?? coldStartOAuthUrl;

  useEffect(() => {
    if (!active || accessToken) return;

    const timeout = setTimeout(() => {
      if (accessToken || finishingRef.current || globalGoogleFinishInFlight) {
        return;
      }
      timedOutRef.current = true;
      setLastGoogleAuthError(
        'Google sign-in timed out. Try again or use email login.',
      );
      void clearPendingGoogleOAuth();
      router.replace('/(auth)/login');
    }, OAUTH_FINISH_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [active, accessToken]);

  useEffect(() => {
    if (!active || accessToken || timedOutRef.current) return;

    if (response?.type === 'cancel' || response?.type === 'dismiss') {
      void clearPendingGoogleOAuth();
      router.replace('/(auth)/login');
      return;
    }
    if (response?.type === 'error') {
      setLastGoogleAuthError('Google sign-in was cancelled or failed.');
      void clearPendingGoogleOAuth();
      router.replace('/(auth)/login');
      return;
    }

    let cancelled = false;

    void (async () => {
      if (
        authReturnUrl &&
        isAbandonedGoogleOAuthReturn(authReturnUrl)
      ) {
        return;
      }
      if (globalGoogleResolveInFlight) return;

      globalGoogleResolveInFlight = true;
      let token: string | null = null;
      try {
        token = await resolveGoogleIdToken(response, authReturnUrl, request);
      } finally {
        globalGoogleResolveInFlight = false;
      }
      if (cancelled) return;

      if (
        !token &&
        authReturnUrl &&
        isGoogleOAuthReturnUrl(authReturnUrl) &&
        oauthUrlHasAuthCode(authReturnUrl)
      ) {
        markGoogleOAuthReturnAbandoned(authReturnUrl);
        setLastGoogleAuthError(
          'Google sign-in could not be completed. Try again or use email login.',
        );
        void clearPendingGoogleOAuth();
        router.replace('/(auth)/login');
        return;
      }

      if (!token || finishingRef.current || globalGoogleFinishInFlight) {
        return;
      }

      finishingRef.current = true;
      globalGoogleFinishInFlight = true;
      setLastGoogleAuthError(null);
      void loginWithGoogle(token)
        .then(() => {
          pendingNavRef.current = true;
          void clearPendingGoogleOAuth();
        })
        .catch((err) => {
          setLastGoogleAuthError(googleAuthErrorMessage(err));
          router.replace('/(auth)/login');
        })
        .finally(() => {
          finishingRef.current = false;
          globalGoogleFinishInFlight = false;
        });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    active,
    response,
    authReturnUrl,
    accessToken,
    loginWithGoogle,
    request,
  ]);

  useEffect(() => {
    if (!active || !accessToken || !pendingNavRef.current) return;
    pendingNavRef.current = false;
    const task = InteractionManager.runAfterInteractions(() => {
      router.replace('/(tabs)/nearby');
    });
    return () => task.cancel();
  }, [active, accessToken]);
}

/** Root handler: always active so cold-start deep links still finish if routing misses oauth screens. */
export function useCompleteGoogleSignInAtRoot() {
  useCompleteGoogleSignIn(true);
}
