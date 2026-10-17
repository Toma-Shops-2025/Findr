import { useCompleteGoogleSignInAtRoot } from '@/lib/completeGoogleSignIn';

/**
 * Finishes Google OAuth at app root when not on a dedicated oauth redirect screen.
 */
export function GoogleAuthSessionHandler() {
  useCompleteGoogleSignInAtRoot();
  return null;
}
