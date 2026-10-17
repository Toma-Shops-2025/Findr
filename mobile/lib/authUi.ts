/**
 * Google-first auth UI (email behind a toggle).
 * Default: Google only in the UI. Set EXPO_PUBLIC_GOOGLE_ONLY_AUTH=false to
 * show "Use email" for existing password accounts.
 */
export const GOOGLE_ONLY_AUTH =
  process.env.EXPO_PUBLIC_GOOGLE_ONLY_AUTH !== 'false';
