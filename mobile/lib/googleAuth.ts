import type { AuthSessionResult } from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

import { savePendingGoogleOAuth } from '@/lib/googleOAuthRecovery';

WebBrowser.maybeCompleteAuthSession();

function readClientId(
  envKey: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID' | 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  extraKey: 'googleWebClientId' | 'googleAndroidClientId',
): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { googleWebClientId?: string; googleAndroidClientId?: string }
    | undefined;
  const fromExtra =
    extraKey === 'googleWebClientId'
      ? extra?.googleWebClientId
      : extra?.googleAndroidClientId;
  return fromExtra ?? process.env[envKey] ?? undefined;
}

/** Google expects this redirect scheme for the Android OAuth client (not app.findr.mobile). */
export function googleAndroidRedirectUri(androidClientId: string): string {
  const prefix = androidClientId.replace('.apps.googleusercontent.com', '');
  return `com.googleusercontent.apps.${prefix}:/oauth2redirect`;
}

export function getGoogleOAuthClientConfig() {
  const webClientId = readClientId(
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'googleWebClientId',
  );
  const androidOAuthClientId = readClientId(
    'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
    'googleAndroidClientId',
  );

  const redirectUri =
    Platform.OS === 'android' && androidOAuthClientId
      ? googleAndroidRedirectUri(androidOAuthClientId)
      : makeRedirectUri({ scheme: 'findr', path: 'oauthredirect' });

  const clientId =
    Platform.OS === 'android'
      ? androidOAuthClientId ?? webClientId ?? ''
      : webClientId ?? '';

  return {
    webClientId,
    androidOAuthClientId,
    redirectUri,
    clientId,
  };
}

export function useGoogleAuthRequest() {
  const { webClientId, androidOAuthClientId, redirectUri, clientId } =
    getGoogleOAuthClientConfig();

  const [request, response, promptAsyncBase] = Google.useIdTokenAuthRequest(
    {
      webClientId,
      androidClientId:
        Platform.OS === 'android'
          ? androidOAuthClientId
          : androidOAuthClientId ?? webClientId,
      iosClientId: webClientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
    },
    Platform.OS === 'android' && androidOAuthClientId
      ? { native: googleAndroidRedirectUri(androidOAuthClientId) }
      : { scheme: 'findr', path: 'oauthredirect' },
  );

  // Persist PKCE as soon as the auth request is ready so a process kill during
  // the Google browser step still allows code exchange on cold start.
  useEffect(() => {
    if (!request?.codeVerifier || !clientId) return;
    void savePendingGoogleOAuth({
      codeVerifier: request.codeVerifier,
      redirectUri,
      clientId,
    });
  }, [clientId, redirectUri, request?.codeVerifier]);

  const promptAsync = useCallback(
    async (...args: Parameters<typeof promptAsyncBase>) => {
      if (request?.codeVerifier && clientId) {
        await savePendingGoogleOAuth({
          codeVerifier: request.codeVerifier,
          redirectUri,
          clientId,
        });
      }
      return promptAsyncBase(...args);
    },
    [clientId, promptAsyncBase, redirectUri, request?.codeVerifier],
  );

  const configured =
    Boolean(webClientId) &&
    (Platform.OS !== 'android' || Boolean(androidOAuthClientId));

  return { request, response, promptAsync, configured, redirectUri };
}

export function idTokenFromGoogleResponse(
  response: AuthSessionResult | null,
): string | null {
  if (response?.type !== 'success') return null;
  return response.authentication?.idToken ?? response.params?.id_token ?? null;
}
