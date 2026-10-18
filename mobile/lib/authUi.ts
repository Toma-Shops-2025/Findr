/**
 * Hide email sign-in/sign-up in the UI (Google only).
 * Default: show Google + email. Set EXPO_PUBLIC_GOOGLE_ONLY_AUTH=true to hide email.
 */
export const GOOGLE_ONLY_AUTH =
  process.env.EXPO_PUBLIC_GOOGLE_ONLY_AUTH === 'true';

/** Emergency off-switch: hide Google UI and skip OAuth redirect finishers. */
export const GOOGLE_AUTH_DISABLED =
  process.env.EXPO_PUBLIC_DISABLE_GOOGLE_AUTH === 'true';
