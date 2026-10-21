/** Last Google sign-in failure for login UI (set by GoogleAuthSessionHandler). */
let lastGoogleAuthError: string | null = null;

export function setLastGoogleAuthError(message: string | null): void {
  lastGoogleAuthError = message;
}

export function consumeLastGoogleAuthError(): string | null {
  const msg = lastGoogleAuthError;
  lastGoogleAuthError = null;
  return msg;
}

export function googleAuthErrorMessage(err: unknown): string {
  const e = err as Error & { code?: string; status?: number };
  if (e.code === 'invalid_google_token') {
    return 'Google sign-in was rejected. Check API Google client IDs on Render.';
  }
  if (e.code === 'email_taken') {
    return 'This email is tied to a different Google account. Try email and password, or the Google account you used before.';
  }
  if (e.message) return e.message;
  return 'Google sign-in failed. Try again.';
}
