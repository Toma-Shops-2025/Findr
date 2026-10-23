import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { yearsSince } from '../modules/auth/ageGate.js';
import { requireAuth } from '../modules/auth/requireAuth.js';
import { getUserStore } from '../modules/auth/userStore.js';
import { formatDistanceBand } from '../modules/geo/coarseLocation.js';
import { getLocationStore } from '../modules/geo/locationStore.js';
import { sanitizeDisplayNameForPublic } from '../modules/profiles/publicDisplay.js';
import { getProfileStore } from '../modules/profiles/profileStore.js';
import { isFreeToMeetActive } from '../modules/profiles/types.js';
import { getBlockStore } from '../modules/safety/blockStore.js';
import { getFavoriteStore } from '../modules/geo/favoriteStore.js';
import {
  demoNearbyCards,
  shouldIncludeDemoNearby,
} from '../modules/geo/demoPersonas.js';

// Lat/lng/accuracy/radius are floats. Only limit (and age elsewhere) are ints.
const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  /** Device GPS accuracy in meters (float). Optional. */
  accuracyM: z.number().min(0).max(50_000).optional(),
});

const nearbyQuerySchema = z.object({
  /** Search radius in miles (US). Takes precedence over radiusKm when set. */
  radiusMiles: z.coerce.number().min(0.5).max(50).optional(),
  radiusKm: z.coerce.number().min(0.5).max(200).optional().default(50),
  limit: z.coerce.number().int().min(1).max(150).optional().default(80),
  /** Optional client coords when the user has not POSTed /geo/location yet. */
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  onlineOnly: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  favoritesOnly: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  freeToMeetOnly: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  /** Comma-separated lookingFor values (dates,friends,casual,...). */
  lookingFor: z.string().max(120).optional(),
});

export type NearbyCard = {
  userId: string;
  displayName: string;
  age: number;
  photoUrls: string[];
  lookingFor: string[];
  distanceLabel: string;
  distanceM: number;
  /** Approximate only - never exact pin. */
  online: boolean;
  isFavorite: boolean;
  freeToMeet: boolean;
};

function fallbackDisplayName(email: string): string {
  let local = email.split('@')[0] ?? 'Member';
  local = local.replace(/^sample[-_]?/i, '');
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
  /** Leave Nearby after the app process ends (no JWT; secret issued at login). */
  app.post('/revoke-grid', async (req, reply) => {
    const parsed = z
      .object({
        userId: z.string().uuid(),
        gridRevokeSecret: z.string().uuid(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body' });
    }
    const users = await getUserStore();
    const ok = await users.verifyGridRevokeSecret(
      parsed.data.userId,
      parsed.data.gridRevokeSecret,
    );
    if (!ok) {
      return reply.code(404).send({ error: 'invalid_or_expired' });
    }
    const { store } = await getLocationStore();
    await store.remove(parsed.data.userId);
    const profiles = await getProfileStore();
    await profiles.clearActive(parsed.data.userId);
    return { ok: true };
  });

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
      // Coarse coords only - already fuzzed server-side.
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

    const radiusM =
      parsed.data.radiusMiles != null
        ? parsed.data.radiusMiles * 1609.344
        : parsed.data.radiusKm * 1000;
    const nearby = await store.nearbyWithin(
      latitude,
      longitude,
      radiusM,
      auth.userId,
      Math.min(parsed.data.limit * 4, 250),
    );

    const blocks = await getBlockStore();
    const blocked = await blocks.blockedPairIds(auth.userId);

    const favorites = await getFavoriteStore();
    const favoriteIds = new Set(await favorites.list(auth.userId));
    const lookingForFilter = parsed.data.lookingFor
      ? parsed.data.lookingFor
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const profiles = await getProfileStore();
    const users = await getUserStore();
    const results: NearbyCard[] = [];

    for (const loc of nearby) {
      if (blocked.has(loc.userId)) continue;
      if (parsed.data.favoritesOnly && !favoriteIds.has(loc.userId)) continue;

      const profile = await profiles.get(loc.userId);
      if (profile && !profile.isVisible) continue;

      const user = await users.findById(loc.userId);
      if (!user) continue;

      const photos = profile?.photoUrls ?? [];
      const hasGridPhoto = photos.some((u) => (u ?? '').trim() && !u.startsWith('stub:'));
      if (!hasGridPhoto) continue;

      const age = yearsSince(user.dateOfBirth);
      // Age-gate-only accounts (no DOB) still appear; UI shows 18+ floor.
      const ageOut = age ?? 18;

      const rawName =
        profile?.displayName?.trim() || fallbackDisplayName(user.email);
      const displayName = sanitizeDisplayNameForPublic(rawName).slice(0, 40);

      const lastActive = profile?.lastActiveAt
        ? Date.parse(profile.lastActiveAt)
        : 0;
      const online =
        lastActive > 0 && Date.now() - lastActive < 15 * 60 * 1000;
      if (parsed.data.onlineOnly && !online) continue;

      const freeToMeet = isFreeToMeetActive(profile?.freeToMeetUntil ?? null);
      if (parsed.data.freeToMeetOnly && !freeToMeet) continue;

      const lookingFor = profile?.lookingFor ?? [];
      if (
        lookingForFilter.length > 0 &&
        !lookingFor.some((lf) => lookingForFilter.includes(lf))
      ) {
        continue;
      }

      results.push({
        userId: loc.userId,
        displayName,
        age: ageOut,
        photoUrls: profile?.photoUrls ?? [],
        lookingFor,
        distanceLabel: formatDistanceBand(loc.distanceM),
        distanceM: Math.round(loc.distanceM),
        online,
        isFavorite: favoriteIds.has(loc.userId),
        freeToMeet,
      });

      if (results.length >= parsed.data.limit) break;
    }

    if (shouldIncludeDemoNearby(results.length)) {
      const existingIds = new Set(results.map((r) => r.userId));
      for (const demo of demoNearbyCards(auth.userId)) {
        if (existingIds.has(demo.userId)) continue;
        results.push(demo);
        if (results.length >= parsed.data.limit) break;
      }
      results.sort((a, b) => a.distanceM - b.distanceM);
    }

    return {
      results,
      mode,
      radiusKm: radiusM / 1000,
      radiusMiles:
        parsed.data.radiusMiles ??
        Math.round((radiusM / 1609.344) * 10) / 10,
      count: results.length,
      sortedBy: 'distance',
      ...(mode === 'memory'
        ? {
            note: 'In-memory geo (no PostGIS). Samples reset when the API process restarts.',
          }
        : {}),
    };
  });

  app.get('/favorites', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;
    const store = await getFavoriteStore();
    const ids = await store.list(auth.userId);
    return { favorites: ids };
  });

  app.post('/favorites/:userId', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;
    const params = z
      .object({ userId: z.string().uuid().or(z.string().min(1).max(80)) })
      .safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' });
    }
    if (params.data.userId === auth.userId) {
      return reply.code(400).send({ error: 'cannot_favorite_self' });
    }
    const users = await getUserStore();
    if (!(await users.findById(params.data.userId))) {
      return reply.code(404).send({ error: 'user_not_found' });
    }
    const store = await getFavoriteStore();
    await store.add(auth.userId, params.data.userId);
    return { ok: true };
  });

  app.delete('/favorites/:userId', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;
    const params = z
      .object({ userId: z.string().uuid().or(z.string().min(1).max(80)) })
      .safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' });
    }
    const store = await getFavoriteStore();
    await store.remove(auth.userId, params.data.userId);
    return { ok: true };
  });
};