/** Hide users whose location was not refreshed within this window (Grindr-style freshness). */
export const LOCATION_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

export function locationFreshCutoffIso(): string {
  return new Date(Date.now() - LOCATION_MAX_AGE_MS).toISOString();
}
