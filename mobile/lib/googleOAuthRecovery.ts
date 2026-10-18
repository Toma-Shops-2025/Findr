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

/** Verifier captured at promptAsync — survives hook remounts until sign-in finishes. */
let promptLockedOAuth: PendingGoogleOAuth | null = null;

/** Same-process fallback when SecureStore read lags after the browser returns. */
let memoryPendingOAuth: PendingGoogleOAuth | null = null;

/** Avoid re-running a failed code exchange for the same deep link forever. */
let abandonedOAuthReturnUrl: string | null = null;

export function markGoogleOAuthReturnAbandoned(url: string): void {
  abandonedOAuthReturnUrl = url;
}

export function clearAbandonedGoogleOAuthReturn(): void {
  abandonedOAuthReturnUrl = null;
}

export function isAbandonedGoogleOAuthReturn(url: string): boolean {
  return abandonedOAuthReturnUrl === url;
}

export function isGoogleOAuthReturnUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('oauth2redirect') ||
    lower.includes('oauthredirect') ||
    lower.includes('com.googleusercontent.apps.')
  );
}

function paramFirst(
  value: string | string[] | undefined | null,
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/** Expo Router often exposes ?code= as route params while Linking has no query string. */
export function googleOAuthReturnUrlFromRouteParams(
  params: Record<string, unknown>,
): string | null {
  const code = paramFirst(params.code as string | string[] | undefined);
  if (!code) return null;
  const { redirectUri } = getGoogleOAuthClientConfig();
  const search = new URLSearchParams({ code });
  const state = paramFirst(params.state as string | string[] | undefined);
  if (state) search.set('state', state);
  return `${redirectUri}?${search.toString()}`;
}

export function extractOAuthAuthCode(url: string | null): string | null {
  if (!url) return null;
  try {
    const { params } = QueryParams.getQueryParams(url);
    return paramFirst(params.code as string | string[] | undefined);
  } catch {
    return null;
  }
}

export type SavePendingGoogleOAuthOptions = {
  /** True when the user taps Continue with Google — always refresh PKCE. */
  force?: boolean;
};

export async function savePendingGoogleOAuth(
  input: {
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
  },
  options: SavePendingGoogleOAuthOptions = {},
): Promise<void> {
  if (!options.force) {
    const existing = await loadPendingGoogleOAuth();
    if (existing) {
      return;
    }
  }
  clearAbandonedGoogleOAuthReturn();
  const payload: PendingGoogleOAuth = {
    ...input,
    savedAt: Date.now(),
  };
  promptLockedOAuth = payload;
  memoryPendingOAuth = payload;
  await writePreference(PENDING_KEY, JSON.stringify(payload));
}

export async function clearPendingGoogleOAuth(): Promise<void> {
  promptLockedOAuth = null;
  memoryPendingOAuth = null;
  await deletePreference(PENDING_KEY);
}

export async function loadPendingGoogleOAuth(): Promise<PendingGoogleOAuth | null> {
  if (promptLockedOAuth) {
    if (Date.now() - promptLockedOAuth.savedAt > PENDING_MAX_AGE_MS) {
      promptLockedOAuth = null;
    } else {
      return promptLockedOAuth;
    }
  }
  if (memoryPendingOAuth) {
    if (Date.now() - memoryPendingOAuth.savedAt > PENDING_MAX_AGE_MS) {
      memoryPendingOAuth = null;
    } else {
      return memoryPendingOAuth;
    }
  }
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

async function exchangeAuthCodeForIdToken(
  code: string,
  pending: PendingGoogleOAuth,
): Promise<string | null> {
  const config = getGoogleOAuthClientConfig();
  const redirectUri = pending.redirectUri || config.redirectUri;
  const clientIds = [
    pending.clientId || config.clientId,
    config.webClientId,
    config.androidOAuthClientId,
  ].filter((id, index, arr) => Boolean(id) && arr.indexOf(id) === index) as string[];

  for (const clientId of clientIds) {
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
        return idToken;
      }
    } catch (err) {
      console.warn('Findr Google OAuth code exchange failed', clientId, err);
    }
  }
  return null;
}

export async function exchangeGoogleIdTokenFromUrl(
  url: string,
): Promise<string | null> {
  const code = extractOAuthAuthCode(url);
  if (!code) return null;

  const pending = await loadPendingGoogleOAuth();
  if (!pending) return null;

  return exchangeAuthCodeForIdToken(code, pending);
}

export async function readGoogleOAuthReturnUrl(): Promise<string | null> {
  const initial = await Linking.getInitialURL();
  if (initial && (isGoogleOAuthReturnUrl(initial) || extractOAuthAuthCode(initial))) {
    return initial;
  }

  return null;
}
