import { formatDistanceBand } from './coarseLocation.js';

export type DemoNearbyCard = {
  userId: string;
  displayName: string;
  age: number;
  photoUrls: string[];
  lookingFor: string[];
  distanceLabel: string;
  distanceM: number;
  online: boolean;
  isFavorite: boolean;
  freeToMeet: boolean;
};

/** Synthetic Nearby cards for empty maps / Play screenshots (not real accounts). */
export type DemoPersona = {
  id: string;
  displayName: string;
  age: number;
  photoUrl: string;
  lookingFor: string[];
  /** Distance from viewer in meters (fixed band for sorting). */
  distanceM: number;
};

const PERSONAS: DemoPersona[] = [
  {
    id: 'demo:persona-alex',
    displayName: 'Alex',
    age: 27,
    photoUrl: 'https://picsum.photos/seed/findr-demo-alex/600/800',
    lookingFor: ['dates', 'friends'],
    distanceM: 420,
  },
  {
    id: 'demo:persona-jordan',
    displayName: 'Jordan',
    age: 31,
    photoUrl: 'https://picsum.photos/seed/findr-demo-jordan/600/800',
    lookingFor: ['casual', 'dates'],
    distanceM: 890,
  },
  {
    id: 'demo:persona-riley',
    displayName: 'Riley',
    age: 24,
    photoUrl: 'https://picsum.photos/seed/findr-demo-riley/600/800',
    lookingFor: ['friends'],
    distanceM: 1200,
  },
  {
    id: 'demo:persona-marcus',
    displayName: 'Marcus',
    age: 29,
    photoUrl: 'https://picsum.photos/seed/findr-demo-marcus/600/800',
    lookingFor: ['relationship', 'dates'],
    distanceM: 2100,
  },
  {
    id: 'demo:persona-sam',
    displayName: 'Sam',
    age: 26,
    photoUrl: 'https://picsum.photos/seed/findr-demo-sam/600/800',
    lookingFor: ['networking', 'friends'],
    distanceM: 3400,
  },
  {
    id: 'demo:persona-nico',
    displayName: 'Nico',
    age: 33,
    photoUrl: 'https://picsum.photos/seed/findr-demo-nico/600/800',
    lookingFor: ['dates'],
    distanceM: 4800,
  },
];

export function isDemoPersonaId(userId: string): boolean {
  return userId.startsWith('demo:persona-');
}

export function getDemoPersona(userId: string): DemoPersona | null {
  return PERSONAS.find((p) => p.id === userId) ?? null;
}

export function demoNearbyCards(_excludeUserId: string): DemoNearbyCard[] {
  return PERSONAS.map((p) => ({
    userId: p.id,
    displayName: p.displayName,
    age: p.age,
    photoUrls: [p.photoUrl],
    lookingFor: p.lookingFor,
    distanceLabel: formatDistanceBand(p.distanceM),
    distanceM: p.distanceM,
    online: true,
    isFavorite: false,
    freeToMeet: false,
  }));
}

export function shouldIncludeDemoNearby(realCount: number): boolean {
  if (process.env.INCLUDE_DEMO_NEARBY === 'false') return false;
  // Default on: fill the grid when the area is quiet (closed beta / new cities).
  if (process.env.INCLUDE_DEMO_NEARBY === 'always') return true;
  return realCount < 4;
}
