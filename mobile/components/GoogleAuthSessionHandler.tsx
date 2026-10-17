import { router, usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef } from 'react';
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
  isGoogleOAuthReturnUrl,
  readGoogleOAuthReturnUrl,
} from '@/lib/googleOAuthRecovery';
import { useAuth } from '@/lib/auth';

const OAUTH_FINISH_TIMEOUT_MS = 45_000;

/**
 * Finishes Google OAuth using the same auth-request instance that opened the browser.
 * Falls back to PKCE recovery when Android deep-links cold-start the oauth redirect route.
 */
export function GoogleAuthSessionHandler() {
  const { loginWithGoogle, accessToken } = useAuth();
  const { response } = useGoogleAuthSession();
  const pathname = usePathname();
  const finishingRef = useRef(false);
  const pendingNavRef = useRef(false);

  const finishWithIdToken = useCallback(
    (token: string) => {
      if (accessToken || finishingRef.current) return;
      finishingRef.current = true;
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
        });
    },
    [accessToken, loginWithGoogle],
  );

  const recoverFromReturnUrl = useCallback(
    async (url: string | null) => {
      if (!url || !isGoogleOAuthReturnUrl(url) || accessToken) return;
      const token = await exchangeGoogleIdTokenFromUrl(url);
      if (token) finishWithIdToken(token);
    },
    [accessToken, finishWithIdToken],
  );

  useEffect(() => {
    const token = idTokenFromGoogleResponse(response);
    if (token) {
      finishWithIdToken(token);
      return;
    }

    if (response?.type === 'success' && response.url) {
      void recoverFromReturnUrl(response.url);
      return;
    }

    if (response?.type === 'error' || response?.type === 'dismiss') {
      setLastGoogleAuthError(
        response.type === 'dismiss'
          ? 'Google sign-in was cancelled.'
          : 'Google sign-in failed. Try again.',
      );
      void clearPendingGoogleOAuth();
      router.replace('/(auth)/login');
    }
  }, [response, finishWithIdToken, recoverFromReturnUrl]);

  useEffect(() => {
    if (accessToken) return;

    void (async () => {
      await recoverFromReturnUrl(await readGoogleOAuthReturnUrl());
    })();

    const sub = Linking.addEventListener('url', ({ url }) => {
      void recoverFromReturnUrl(url);
    });
    return () => sub.remove();
  }, [accessToken, recoverFromReturnUrl]);

  useEffect(() => {
    const onOAuthScreen =
      pathname === '/oauth2redirect' || pathname === '/oauthredirect';
    if (!onOAuthScreen || accessToken) return;

    const timer = setTimeout(() => {
      if (accessToken || finishingRef.current) return;
      setLastGoogleAuthError(
        'Google sign-in timed out. Close the app and try again.',
      );
      void clearPendingGoogleOAuth();
      router.replace('/(auth)/login');
    }, OAUTH_FINISH_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [accessToken, pathname]);

  useEffect(() => {
    if (!pendingNavRef.current || !accessToken) return;
    pendingNavRef.current = false;
    const task = InteractionManager.runAfterInteractions(() => {
      router.replace('/(tabs)/nearby');
    });
    return () => task.cancel();
  }, [accessToken]);

  return null;
}
