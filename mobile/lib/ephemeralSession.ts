/**
 * Grindr-style: JWT lives in memory for this process only.
 * Swiping the app away ends the session; user signs in again on next open.
 * Push tokens are registered server-side each launch after Google sign-in.
 */
export const EPHEMERAL_SESSION = true;
