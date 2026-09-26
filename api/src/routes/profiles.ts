import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { yearsSince } from '../modules/auth/ageGate.js';
import { requireAuth } from '../modules/auth/requireAuth.js';
import { getUserStore } from '../modules/auth/userStore.js';
import { isAllowedUploadUrl } from '../modules/media/storage.js';
import { getProfileStore } from '../modules/profiles/profileStore.js';
import type { LookingFor, ProfileRecord, PublicProfile } from '../modules/profiles/types.js';
import { getBlockStore } from '../modules/safety/blockStore.js';

const lookingForEnum = z.enum([
  'dates',
  'friends',
  'casual',
  'relationship',
  'networking',
]);

const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  bio: z.string().max(500).optional(),
  genderIdentity: z.string().max(80).optional(),
  orientationsShown: z.array(z.string().max(60)).max(12).optional(),
  orientationsSeeking: z.array(z.string().max(60)).max(12).optional(),
  lookingFor: z.array(lookingForEnum).max(8).optional(),
  // http(s), local /uploads/…, or stub:photo-N placeholders.
  photoUrls: z
    .array(z.string().max(500))
    .max(6)
    .optional()
    .refine((urls) => !urls || urls.every((u) => isAllowedUploadUrl(u)), {
      message: 'photoUrls must be http(s), /uploads/…, or stub:…',
    }),
  /** Profile age (not DOB). When set, must be 18+. */
  age: z
    .number()
    .int()
    .min(18, { message: 'age must be 18 or older' })
    .max(120)
    .nullable()
    .optional(),
  isVisible: z.boolean().optional(),
});

function resolveAge(
  record: ProfileRecord | null,
  dateOfBirth: string | null,
): number | null {
  if (record?.age != null) return record.age;
  return yearsSince(dateOfBirth);
}

function toPublicProfile(
  record: ProfileRecord | null,
  userId: string,
  dateOfBirth: string | null,
): PublicProfile {
  const age = resolveAge(record, dateOfBirth);
  if (!record) {
    return {
      userId,
      displayName: '',
      bio: '',
      genderIdentity: '',
      orientationsShown: [],
      orientationsSeeking: [],
      lookingFor: [],
      photoUrls: [],
      age,
      isVisible: true,
      lastActiveAt: null,
      updatedAt: new Date().toISOString(),
      exists: false,
    };
  }
  return {
    userId: record.userId,
    displayName: record.displayName,
    bio: record.bio,
    genderIdentity: record.genderIdentity,
    orientationsShown: record.orientationsShown,
    orientationsSeeking: record.orientationsSeeking,
    lookingFor: record.lookingFor,
    photoUrls: record.photoUrls,
    age,
    isVisible: record.isVisible,
    lastActiveAt: record.lastActiveAt,
    updatedAt: record.updatedAt,
    exists: true,
  };
}

/** Profile CRUD for the authenticated user. */
export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const store = await getProfileStore();
    const record = await store.get(auth.userId);
    return {
      profile: toPublicProfile(record, auth.userId, auth.user.dateOfBirth),
    };
  });

  app.put('/me', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    // Extra guard: reject under-18 ages even if schema drifts.
    if (parsed.data.age != null && parsed.data.age < 18) {
      return reply.code(400).send({
        error: 'age_under_18',
        message: 'Findr is 18+ only. Age must be 18 or older.',
      });
    }

    const store = await getProfileStore();
    const update: {
      displayName: string;
      bio?: string;
      genderIdentity?: string;
      orientationsShown?: string[];
      orientationsSeeking?: string[];
      lookingFor?: LookingFor[];
      photoUrls?: string[];
      age?: number | null;
      isVisible?: boolean;
    } = { displayName: parsed.data.displayName };
    if (parsed.data.bio !== undefined) update.bio = parsed.data.bio;
    if (parsed.data.genderIdentity !== undefined) {
      update.genderIdentity = parsed.data.genderIdentity;
    }
    if (parsed.data.orientationsShown !== undefined) {
      update.orientationsShown = parsed.data.orientationsShown;
    }
    if (parsed.data.orientationsSeeking !== undefined) {
      update.orientationsSeeking = parsed.data.orientationsSeeking;
    }
    if (parsed.data.lookingFor !== undefined) {
      update.lookingFor = parsed.data.lookingFor as LookingFor[];
    }
    if (parsed.data.photoUrls !== undefined) {
      update.photoUrls = parsed.data.photoUrls;
    }
    if (parsed.data.age !== undefined) {
      update.age = parsed.data.age;
    }
    if (parsed.data.isVisible !== undefined) {
      update.isVisible = parsed.data.isVisible;
    }
    const record = await store.upsert(auth.userId, update);

    return {
      profile: toPublicProfile(record, auth.userId, auth.user.dateOfBirth),
    };
  });

  /** Peer profile for Nearby / chat safety actions. Respects mutual blocks. */
  app.get('/:userId', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const params = z
      .object({ userId: z.string().uuid().or(z.string().min(1).max(80)) })
      .safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' });
    }

    const peerId = params.data.userId;
    if (peerId === auth.userId) {
      const store = await getProfileStore();
      const record = await store.get(auth.userId);
      return {
        profile: toPublicProfile(record, auth.userId, auth.user.dateOfBirth),
      };
    }

    const blocks = await getBlockStore();
    const blocked = await blocks.blockedPairIds(auth.userId);
    if (blocked.has(peerId)) {
      return reply.code(404).send({ error: 'profile_unavailable' });
    }

    const users = await getUserStore();
    const peer = await users.findById(peerId);
    if (!peer) {
      return reply.code(404).send({ error: 'user_not_found' });
    }

    const store = await getProfileStore();
    const record = await store.get(peerId);
    if (!record || !record.isVisible) {
      return reply.code(404).send({ error: 'profile_unavailable' });
    }

    return {
      profile: toPublicProfile(record, peerId, peer.dateOfBirth),
    };
  });
};
