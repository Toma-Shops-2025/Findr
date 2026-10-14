import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

import { idTokenFromGoogleResponse } from '@/lib/googleAuth';
import {
  googleAuthErrorMessage,
  setLastGoogleAuthError,
} from '@/lib/googleAuthErrors';
import { useGoogleAuthSession } from '@/lib/googleAuthContext';
import { useAuth } from '@/lib/auth';

/**
 * Finishes Google OAuth using the same auth-request instance that opened the browser.
 */
export function GoogleAuthSessionHandler() {
  const { loginWithGoogle, accessToken } = useAuth();
  const { response } = useGoogleAuthSession();
  const finishingRef = useRef(false);
  const pendingNavRef = useRef(false);

  useEffect(() => {
    const token = idTokenFromGoogleResponse(response);
    if (!token || accessToken || finishingRef.current) return;

    finishingRef.current = true;
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
      });
  }, [response, accessToken, loginWithGoogle]);

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
