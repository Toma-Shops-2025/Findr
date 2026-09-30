/**
 * Chat location share helpers.
 *
 * Policy (v1): round to 3 decimal places (~100m). Deterministic so maps
 * directions still make sense. No precise opt-in in v1.
 * Findr-only: never write a location "memory" into the device gallery.
 */

export function roundCoord(value: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function approximateChatLocation(
  latitude: number,
  longitude: number,
  accuracyM?: number | null,
): { lat: number; lng: number; accuracyM: number | null } {
  return {
    lat: roundCoord(latitude, 3),
    lng: roundCoord(longitude, 3),
    accuracyM:
      accuracyM != null && Number.isFinite(accuracyM) && accuracyM >= 0
        ? Math.round(accuracyM)
        : null,
  };
}

/** Google Maps directions / Apple Maps geo URI. */
export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export const SHARE_LOCATION_TITLE = 'Share your location?';

export const SHARE_LOCATION_BODY =
  'This sends your approximate location to this chat only.\n\n' +
  'Only share with people you trust. You never have to share.\n\n' +
  'If you meet up: choose a public place and tell a friend.';

export const OPEN_DIRECTIONS_TITLE = 'Open directions?';

export const OPEN_DIRECTIONS_BODY =
  'You are about to leave Findr and open maps.\n\n' +
  'Meet in a public place. Tell someone your plans.\n\n' +
  'Leave if you feel uncomfortable.';
