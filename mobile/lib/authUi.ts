/**
 * Hide email sign-in/sign-up in the UI (Google only).
 * Default: email + Google. Set EXPO_PUBLIC_GOOGLE_ONLY_AUTH=true to hide email.
 */
export const GOOGLE_ONLY_AUTH =
  process.env.EXPO_PUBLIC_GOOGLE_ONLY_AUTH === 'true';
