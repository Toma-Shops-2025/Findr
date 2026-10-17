import type { AuthSessionResult } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { idTokenFromGoogleResponse } from '@/lib/googleAuth';
import {
  googleAuthErrorMessage,
  setLastGoogleAuthError,
} from '@/lib/googleAuthErrors';
import { useGoogleAuthSession } from '@/lib/googleAuthContext';
import { useAuth } from '@/lib/auth';

/** Prevent duplicate API calls when root handler + oauth redirect screen both mount. */
let globalGoogleFinishInFlight = false;

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

  useEffect(() => {
    if (!active) return;
    void Linking.getInitialURL().then((url) => {
      if (url) setInitialUrl(url);
    });
  }, [active]);

  const authReturnUrl = linkUrl ?? initialUrl;

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
      router.replace('/(auth)/login');
    }, 25_000);

    return () => clearTimeout(timeout);
  }, [active, accessToken]);

  useEffect(() => {
    if (!active || accessToken || timedOutRef.current) return;

    if (response?.type === 'cancel' || response?.type === 'dismiss') {
      router.replace('/(auth)/login');
      return;
    }
    if (response?.type === 'error') {
      setLastGoogleAuthError('Google sign-in was cancelled or failed.');
      router.replace('/(auth)/login');
      return;
    }

    const token =
      idTokenFromGoogleResponse(response) ??
      tokenFromAuthUrl(authReturnUrl, request);

    if (!token || finishingRef.current || globalGoogleFinishInFlight) return;

    finishingRef.current = true;
    globalGoogleFinishInFlight = true;
    setLastGoogleAuthError(null);
    void loginWithGoogle(token)
      .then(() => {
        pendingNavRef.current = true;
      })
      .catch((err) => {
        setLastGoogleAuthError(googleAuthErrorMessage(err));
        router.replace('/(auth)/login');
      })
      .finally(() => {
        finishingRef.current = false;
        globalGoogleFinishInFlight = false;
      });
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

/** Root handler: skip when the dedicated OAuth return screen is active. */
export function useCompleteGoogleSignInAtRoot() {
  const pathname = usePathname();
  const onDedicatedOAuthScreen =
    pathname === '/oauth2redirect' || pathname === '/oauthredirect';
  useCompleteGoogleSignIn(!onDedicatedOAuthScreen);
}
