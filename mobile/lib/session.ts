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

export async function saveSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

export async function loadSession(): Promise<AuthSession | null> {
  const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
  const userJson = await SecureStore.getItemAsync(USER_KEY);
  if (!accessToken || !userJson) return null;
  try {
    const user = JSON.parse(userJson) as AuthUser;
    return { accessToken, user };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
