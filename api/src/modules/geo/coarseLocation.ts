/** Coarse location helpers — never store exact public pins. */
export function fuzzCoordinate(value: number, metersApprox = 250): number {
  // Stub: real fuzzing should use geodesic offset + hash/binning.
  const degreeJitter = metersApprox / 111_320;
  return value + (Math.random() - 0.5) * degreeJitter;
}
