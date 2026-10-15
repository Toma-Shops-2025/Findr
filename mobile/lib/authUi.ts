/**
 * Google-only auth in the UI (no email sign-in/sign-up).
 * Set EXPO_PUBLIC_GOOGLE_ONLY_AUTH=false to re-enable email for testing.
 */
export const GOOGLE_ONLY_AUTH =
  process.env.EXPO_PUBLIC_GOOGLE_ONLY_AUTH !== 'false';
