import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { yearsSince } from '../modules/auth/ageGate.js';
import { requireAuth } from '../modules/auth/requireAuth.js';
import { getUserStore } from '../modules/auth/userStore.js';
import { formatDistanceBand } from '../modules/geo/coarseLocation.js';
import { getLocationStore } from '../modules/geo/locationStore.js';
import { getProfileStore } from '../modules/profiles/profileStore.js';
import { getBlockStore } from '../modules/safety/blockStore.js';

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(50_000).optional(),
});

const nearbyQuerySchema = z.object({
  radiusKm: z.coerce.number().min(0.5).max(200).optional().default(50),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  /** Optional client coords when the user has not POSTed /geo/location yet. */
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type NearbyCard = {
  userId: string;
  displayName: string;
  age: number;
  photoUrls: string[];
  lookingFor: string[];
  distanceLabel: string;
  /** Approximate only — never exact pin. */
  online: boolean;
};

function fallbackDisplayName(email: string): string {
  const local = email.split('@')[0] ?? 'Member';
  const cleaned = local.replace(/[._+-]+/g, ' ').trim();
  if (!cleaned) return 'Member';
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);
}

/**
 * Coarse location + nearby.
 * Prefers PostGIS ST_DWithin when DATABASE_URL + PostGIS are available;
 * otherwise uses an in-memory haversine fallback (response.mode = "memory").
 */
export const geoRoutes: FastifyPluginAsync = async (app) => {
  app.post('/location', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const { store, mode } = await getLocationStore();
    const saved = await store.upsert(
      auth.userId,
      parsed.data.latitude,
      parsed.data.longitude,
      parsed.data.accuracyM,
    );

    const profiles = await getProfileStore();
    await profiles.touchActive(auth.userId);

    return {
      ok: true,
      mode,
      recordedAt: saved.recordedAt,
      // Coarse coords only — already fuzzed server-side.
      coarse: {
        latitude: Number(saved.latitude.toFixed(3)),
        longitude: Number(saved.longitude.toFixed(3)),
      },
    };
  });

  app.get('/nearby', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = nearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_query',
        details: parsed.error.flatten(),
      });
    }

    const { store, mode } = await getLocationStore();
    const stored = await store.get(auth.userId);

    const latitude = parsed.data.latitude ?? stored?.latitude;
    const longitude = parsed.data.longitude ?? stored?.longitude;

    if (latitude == null || longitude == null) {
      return reply.code(400).send({
        error: 'location_required',
        message:
          'Share your location first (POST /geo/location) or pass latitude & longitude query params.',
        results: [],
        mode,
      });
    }

    // If query coords provided and no stored location yet, persist a coarse copy.
    if (!stored && parsed.data.latitude != null && parsed.data.longitude != null) {
      await store.upsert(auth.userId, latitude, longitude);
    }

    const radiusM = parsed.data.radiusKm * 1000;
    const nearby = await store.nearbyWithin(
      latitude,
      longitude,
      radiusM,
      auth.userId,
    );

    const blocks = await getBlockStore();
    const blocked = await blocks.blockedPairIds(auth.userId);

    const profiles = await getProfileStore();
    const users = await getUserStore();
    const results: NearbyCard[] = [];

    for (const loc of nearby) {
      if (blocked.has(loc.userId)) continue;

      const profile = await profiles.get(loc.userId);
      if (profile && !profile.isVisible) continue;

      const user = await users.findById(loc.userId);
      if (!user) continue;

      const age = yearsSince(user.dateOfBirth);
      // Age-gate-only accounts (no DOB) still appear; UI shows 18+ floor.
      const ageOut = age ?? 18;

      const displayName =
        (profile?.displayName?.trim() || fallbackDisplayName(user.email)).slice(
          0,
          40,
        );

      const lastActive = profile?.lastActiveAt
        ? Date.parse(profile.lastActiveAt)
        : Date.parse(loc.updatedAt);
      const online = lastActive > 0 && Date.now() - lastActive < 15 * 60 * 1000;

      results.push({
        userId: loc.userId,
        displayName,
        age: ageOut,
        photoUrls: profile?.photoUrls ?? [],
        lookingFor: profile?.lookingFor ?? [],
        distanceLabel: formatDistanceBand(loc.distanceM),
        online,
      });

      if (results.length >= parsed.data.limit) break;
    }

    return {
      results,
      mode,
      radiusKm: parsed.data.radiusKm,
      count: results.length,
      ...(mode === 'memory'
        ? {
            note: 'In-memory geo (no PostGIS). Samples reset when the API process restarts.',
          }
        : {}),
    };
  });
};
