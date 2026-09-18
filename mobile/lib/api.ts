import Constants from 'expo-constants';

/**
 * API base URL for the Findr backend.
 * On a physical Galaxy S9, use your PC's LAN IP — not localhost.
 * Set EXPO_PUBLIC_API_URL in mobile/.env (see .env.example).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '');

  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  if (extra?.apiUrl) return extra.apiUrl.replace(/\/$/, '');

  // Emulator / same-machine default
  return 'http://localhost:4000';
}

export type ApiError = {
  error: string;
  message?: string;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    const err = new Error(data.message ?? data.error ?? `http_${res.status}`);
    (err as Error & { status?: number; code?: string }).status = res.status;
    (err as Error & { status?: number; code?: string }).code = data.error;
    throw err;
  }
  return data;
}
