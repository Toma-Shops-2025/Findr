/** Client-side coarse jitter before upload (~250m). Server fuzzes again. */

export function fuzzCoordinate(value: number, metersApprox = 250): number {
  const degreeJitter = metersApprox / 111_320;
  return value + (Math.random() - 0.5) * 2 * degreeJitter;
}

export function fuzzLatLng(
  latitude: number,
  longitude: number,
  metersApprox = 250,
): { latitude: number; longitude: number } {
  return {
    latitude: fuzzCoordinate(latitude, metersApprox),
    longitude: fuzzCoordinate(longitude, metersApprox),
  };
}

/** Demo center when GPS is denied / unavailable (Louisville KY-ish). */
export const DEMO_COORDS = { latitude: 38.2527, longitude: -85.7585 };
