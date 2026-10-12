import type { AuthSessionResult } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

export function useGoogleAuthRequest() {
  const webClientId = readClientId(
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'googleWebClientId',
  );
  const androidOAuthClientId = readClientId(
    'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
    'googleAndroidClientId',
  );
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId,
    // Never pass the Web client ID as androidClientId (causes custom-scheme error).
    androidClientId:
      Platform.OS === 'android'
        ? androidOAuthClientId
        : androidOAuthClientId ?? webClientId,
  });
  const configured =
    Boolean(webClientId) &&
    (Platform.OS !== 'android' || Boolean(androidOAuthClientId));
  return { request, response, promptAsync, configured };
}

export function idTokenFromGoogleResponse(
  response: AuthSessionResult | null,
): string | null {
  if (response?.type !== 'success') return null;
  return response.authentication?.idToken ?? response.params?.id_token ?? null;
}
