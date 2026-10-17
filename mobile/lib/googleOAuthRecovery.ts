import * as Linking from 'expo-linking';
import { exchangeCodeAsync } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { getGoogleOAuthClientConfig } from '@/lib/googleAuth';
import {
  deletePreference,
  readPreference,
  writePreference,
} from '@/lib/session';

const PENDING_KEY = 'findr.googleOAuthPending';

type PendingGoogleOAuth = {
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  savedAt: number;
};

const GOOGLE_TOKEN_DISCOVERY = {
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const PENDING_MAX_AGE_MS = 10 * 60 * 1000;

export function isGoogleOAuthReturnUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('oauth2redirect') ||
    lower.includes('oauthredirect') ||
    lower.includes('com.googleusercontent.apps.')
  );
}

export async function savePendingGoogleOAuth(input: {
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<void> {
  const payload: PendingGoogleOAuth = {
    ...input,
    savedAt: Date.now(),
  };
  await writePreference(PENDING_KEY, JSON.stringify(payload));
}

export async function clearPendingGoogleOAuth(): Promise<void> {
  await deletePreference(PENDING_KEY);
}

export async function loadPendingGoogleOAuth(): Promise<PendingGoogleOAuth | null> {
  const raw = await readPreference(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingGoogleOAuth;
    if (
      !parsed.codeVerifier ||
      !parsed.redirectUri ||
      !parsed.clientId ||
      !parsed.savedAt
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > PENDING_MAX_AGE_MS) {
      await clearPendingGoogleOAuth();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function exchangeGoogleIdTokenFromUrl(
  url: string,
): Promise<string | null> {
  if (!isGoogleOAuthReturnUrl(url)) return null;

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode || params.error) return null;

  const code = params.code;
  if (!code) return null;

  const pending = await loadPendingGoogleOAuth();
  if (!pending) return null;

  const config = getGoogleOAuthClientConfig();
  const clientId = pending.clientId || config.clientId;
  const redirectUri = pending.redirectUri || config.redirectUri;

  try {
    const token = await exchangeCodeAsync(
      {
        clientId,
        code,
        redirectUri,
        extraParams: {
          code_verifier: pending.codeVerifier,
        },
      },
      GOOGLE_TOKEN_DISCOVERY,
    );
    const idToken = token.idToken ?? null;
    if (idToken) {
      await clearPendingGoogleOAuth();
    }
    return idToken;
  } catch (err) {
    console.warn('Findr Google OAuth code exchange failed', err);
    return null;
  }
}

export async function readGoogleOAuthReturnUrl(): Promise<string | null> {
  const initial = await Linking.getInitialURL();
  if (initial && isGoogleOAuthReturnUrl(initial)) return initial;

  return null;
}
