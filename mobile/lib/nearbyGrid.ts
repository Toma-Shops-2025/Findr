import type { NearbyCard } from '@/lib/types';

/** Max distance shown on the Nearby tab (US miles). */
export const NEARBY_RADIUS_MILES = 50;

/** Miles → km for API `radiusKm` (server uses km for PostGIS). */
export const NEARBY_RADIUS_KM = NEARBY_RADIUS_MILES * 1.609344;

/** Close band pinned above the separator (Grindr-style top grid). */
export const NEARBY_CLOSE_SECTION_MILES = 10;

export const NEARBY_FETCH_LIMIT = 100;

const CLOSE_SECTION_METERS = NEARBY_CLOSE_SECTION_MILES * 1609.344;

export function splitNearbyByDistance(items: NearbyCard[]): {
  close: NearbyCard[];
  farther: NearbyCard[];
} {
  const close: NearbyCard[] = [];
  const farther: NearbyCard[] = [];
  for (const item of items) {
    const m = item.distanceM ?? Number.MAX_SAFE_INTEGER;
    if (m <= CLOSE_SECTION_METERS) close.push(item);
    else farther.push(item);
  }
  return { close, farther };
}

export type NearbyGridRow =
  | { kind: 'sectionTitle'; title: string }
  | { kind: 'separator' }
  | { kind: 'cards'; cards: NearbyCard[] };

export function buildNearbyGridRows(items: NearbyCard[]): NearbyGridRow[] {
  const sorted = [...items].sort(
    (a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0),
  );
  const { close, farther } = splitNearbyByDistance(sorted);
  const rows: NearbyGridRow[] = [];

  const pushSection = (title: string, cards: NearbyCard[]) => {
    if (!cards.length) return;
    rows.push({ kind: 'sectionTitle', title });
    for (let i = 0; i < cards.length; i += 3) {
      rows.push({ kind: 'cards', cards: cards.slice(i, i + 3) });
    }
  };

  if (close.length && farther.length) {
    pushSection('Nearby', close);
    rows.push({ kind: 'separator' });
    pushSection('More within 50 mi', farther);
  } else {
    pushSection('Nearby', sorted);
  }

  return rows;
}
