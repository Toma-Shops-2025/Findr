/** Session cache so tab switches do not block on GPS every time. */

export type CachedCoords = {
  latitude: number;
  longitude: number;
  accuracyM?: number;
};

let cached: CachedCoords | null = null;
let cachedAtMs = 0;

const GPS_TTL_MS = 5 * 60 * 1000;

export function readCachedCoords(maxAgeMs = GPS_TTL_MS): CachedCoords | null {
  if (!cached) return null;
  if (Date.now() - cachedAtMs > maxAgeMs) return null;
  return cached;
}

export function writeCachedCoords(coords: CachedCoords): void {
  cached = coords;
  cachedAtMs = Date.now();
}

export function clearCachedCoords(): void {
  cached = null;
  cachedAtMs = 0;
}
