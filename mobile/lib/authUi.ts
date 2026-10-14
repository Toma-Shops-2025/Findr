/**
 * When true, hide email sign-in/sign-up in the UI (Google only).
 * Keep false until Google OAuth is verified on production builds.
 * Set EXPO_PUBLIC_GOOGLE_ONLY_AUTH=true in EAS production env when ready.
 */
export const GOOGLE_ONLY_AUTH =
  process.env.EXPO_PUBLIC_GOOGLE_ONLY_AUTH === 'true';
