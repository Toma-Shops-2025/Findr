/** Coarse location helpers — never store or expose exact public pins. */

export function fuzzCoordinate(value: number, metersApprox = 250): number {
  const degreeJitter = metersApprox / 111_320;
  return value + (Math.random() - 0.5) * 2 * degreeJitter;
}

/** Haversine distance in meters (memory / demo fallback). */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Approximate distance band for clients — never exact meters.
 * Uses miles for the US-first Android MVP.
 */
export function formatDistanceBand(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return '~0.1 mi';
  if (miles < 10) return `~${miles.toFixed(1)} mi`;
  return `~${Math.round(miles)} mi`;
}

export type CoarseLocation = {
  userId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
  updatedAt: string;
};
