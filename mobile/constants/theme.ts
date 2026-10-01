/**
 * Findr brand tokens — original visual direction.
 * Warm coral accent on deep ink; not a competitor clone look.
 *
 * System fonts only. Do not reference @expo-google-fonts names here —
 * unloaded custom fontFamily strings can blank text on some Android devices,
 * and font loading must never gate first paint / crash the splash path.
 */
export const colors = {
  ink: '#12151C',
  inkElevated: '#1A1F2B',
  mist: '#E8E4DC',
  mistMuted: '#A8A39A',
  coral: '#FF6B4A',
  coralDim: '#C45438',
  teal: '#2A9D8F',
  border: '#2C3344',
  danger: '#E5484D',
  online: '#3DDC97',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;

/** Intentionally undefined — RN uses the platform system font. */
export const typography = {
  brand: undefined as string | undefined,
  heading: undefined as string | undefined,
  body: undefined as string | undefined,
  bodyMedium: undefined as string | undefined,
};
