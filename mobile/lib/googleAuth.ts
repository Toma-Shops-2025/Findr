import type { AuthSessionResult } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

function webClientId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined;
  return (
    extra?.googleWebClientId ??
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    undefined
  );
}

export function useGoogleAuthRequest() {
  const clientId = webClientId();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: clientId,
    androidClientId: clientId,
  });
  return { request, response, promptAsync, configured: Boolean(clientId) };
}

export function idTokenFromGoogleResponse(
  response: AuthSessionResult | null,
): string | null {
  if (response?.type !== 'success') return null;
  return response.authentication?.idToken ?? response.params?.id_token ?? null;
}
