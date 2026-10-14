import { createContext, useContext, type ReactNode } from 'react';

import { useGoogleAuthRequest } from '@/lib/googleAuth';

type GoogleAuthContextValue = ReturnType<typeof useGoogleAuthRequest>;

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

/**
 * One shared `useIdTokenAuthRequest` for the whole app. A second hook instance
 * (e.g. on Login + root handler) drops the OAuth response on Android.
 */
export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const value = useGoogleAuthRequest();
  return (
    <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>
  );
}

export function useGoogleAuthSession(): GoogleAuthContextValue {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) {
    throw new Error('useGoogleAuthSession must be used within GoogleAuthProvider');
  }
  return ctx;
}
