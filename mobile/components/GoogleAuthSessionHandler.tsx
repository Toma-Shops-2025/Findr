import { useCompleteGoogleSignInAtRoot } from '@/lib/completeGoogleSignIn';

/**
 * Finishes Google OAuth using the same auth-request instance that opened the browser.
 */
export function GoogleAuthSessionHandler() {
  useCompleteGoogleSignInAtRoot();
  return null;
}
