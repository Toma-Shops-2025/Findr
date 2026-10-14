import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { idTokenFromGoogleResponse, useGoogleAuthRequest } from '@/lib/googleAuth';
import { useAuth } from '@/lib/auth';

/**
 * Must stay mounted while Google OAuth runs. If only Login mounts the hook,
 * Android deep-link to /oauth2redirect unmounts Login and the id token is lost.
 */
export function GoogleAuthSessionHandler() {
  const { loginWithGoogle, accessToken } = useAuth();
  const { response } = useGoogleAuthRequest();
  const finishingRef = useRef(false);

  useEffect(() => {
    const token = idTokenFromGoogleResponse(response);
    if (!token || accessToken || finishingRef.current) return;

    finishingRef.current = true;
    void loginWithGoogle(token)
      .then(() => {
        router.replace('/(tabs)/nearby');
      })
      .catch(() => {
        router.replace('/(auth)/login');
      })
      .finally(() => {
        finishingRef.current = false;
      });
  }, [response, accessToken, loginWithGoogle]);

  return null;
}
