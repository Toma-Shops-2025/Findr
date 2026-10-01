import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'findr.accessToken';
const USER_KEY = 'findr.user';

export type AuthUser = {
  id: string;
  email: string;
  dateOfBirth: string;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

/**
 * Session storage that prefers expo-secure-store on native Android/iOS when the
 * native module is healthy, and falls back to localStorage (web) or in-memory
 * when SecureStore is missing, mismatched, or throws.
 *
 * Never throws from get/set/delete — web (`getValueWithKeyAsync is not a
 * function`) and broken native bridges must not crash auth boot.
 */

/** Process-local fallback when neither SecureStore nor localStorage works. */
const memoryStore = new Map<string, string>();

/**
 * Sticky disable after web, isAvailableAsync=false, or a SecureStore call fails
 * (native module mismatch). Avoids repeated broken native calls.
 */
let secureStoreDisabled = Platform.OS === 'web';

function canUseLocalStorage(): boolean {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls || typeof ls.getItem !== 'function') return false;
    const probe = '__findr_session_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

async function isSecureStoreUsable(): Promise<boolean> {
  if (secureStoreDisabled) return false;
  try {
    if (typeof SecureStore.isAvailableAsync === 'function') {
      const available = await SecureStore.isAvailableAsync();
      if (!available) {
        secureStoreDisabled = true;
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('SecureStore availability check failed', err);
    secureStoreDisabled = true;
    return false;
  }
}

function disableSecureStore(reason: unknown, op: string, key: string): void {
  secureStoreDisabled = true;
  console.warn(`SecureStore ${op} failed; using fallback`, key, reason);
}

async function fallbackGet(key: string): Promise<string | null> {
  try {
    if (canUseLocalStorage()) {
      return localStorage.getItem(key);
    }
  } catch (err) {
    console.warn('localStorage get failed', key, err);
  }
  return memoryStore.has(key) ? (memoryStore.get(key) as string) : null;
}

async function fallbackSet(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  try {
    if (canUseLocalStorage()) {
      localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn('localStorage set failed', key, err);
  }
}

async function fallbackDelete(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    if (canUseLocalStorage()) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('localStorage delete failed', key, err);
  }
}

async function safeGet(key: string): Promise<string | null> {
  try {
    if (await isSecureStoreUsable()) {
      return await SecureStore.getItemAsync(key);
    }
  } catch (err) {
    disableSecureStore(err, 'get', key);
  }
  try {
    return await fallbackGet(key);
  } catch (err) {
    console.warn('session fallback get failed', key, err);
    return null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    if (await isSecureStoreUsable()) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch (err) {
    disableSecureStore(err, 'set', key);
  }
  try {
    await fallbackSet(key, value);
  } catch (err) {
    console.warn('session fallback set failed', key, err);
  }
}

async function safeDelete(key: string): Promise<void> {
  try {
    if (await isSecureStoreUsable()) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch (err) {
    disableSecureStore(err, 'delete', key);
  }
  try {
    await fallbackDelete(key);
  } catch (err) {
    console.warn('session fallback delete failed', key, err);
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  try {
    await safeSet(TOKEN_KEY, session.accessToken);
    await safeSet(USER_KEY, JSON.stringify(session.user));
  } catch (err) {
    console.warn('saveSession failed', err);
  }
}

export async function loadSession(): Promise<AuthSession | null> {
  try {
    const accessToken = await safeGet(TOKEN_KEY);
    const userJson = await safeGet(USER_KEY);
    if (!accessToken || !userJson) return null;
    try {
      const user = JSON.parse(userJson) as AuthUser;
      return { accessToken, user };
    } catch {
      return null;
    }
  } catch (err) {
    console.warn('loadSession failed', err);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await safeDelete(TOKEN_KEY);
    await safeDelete(USER_KEY);
  } catch (err) {
    console.warn('clearSession failed', err);
  }
}
