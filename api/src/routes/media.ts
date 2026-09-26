import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';

import { requireAuth } from '../modules/auth/requireAuth.js';
import {
  getAlbumStore,
  sourceFromKind,
  type AlbumSource,
} from '../modules/media/albumStore.js';
import {
  PHOTO_MAX_BYTES,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DURATION_MS,
  detectMediaType,
  isAllowedUploadUrl,
  saveUploadStream,
  type UploadKind,
} from '../modules/media/storage.js';
import { getProfileStore } from '../modules/profiles/profileStore.js';

const kindSchema = z.enum(['profile', 'chat', 'album']);
const sourceSchema = z.enum(['upload', 'chat', 'camera', 'profile', 'album']);

/**
 * JWT-protected image/video uploads -> local api/uploads/.
 * Chat/camera/album uploads are also saved to the user's personal Findr album.
 * TODO (Play Store): replace with signed S3/CDN uploads + moderation pipeline.
 *
 * Limits:
 *   photo  8MB
 *   video  25MB, max 30s (duration_ms form field; client-enforced on record)
 */
export const mediaRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, {
    limits: {
      fileSize: VIDEO_MAX_BYTES,
      files: 1,
      fields: 8,
    },
  });

  app.post('/upload', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const q = z
      .object({ kind: kindSchema.optional() })
      .safeParse(req.query);
    let kind: UploadKind =
      q.success && q.data.kind ? q.data.kind : 'chat';

    const data = await req.file();
    if (!data) {
      return reply.code(400).send({ error: 'file_required' });
    }

    const fields = data.fields as Record<
      string,
      { value?: unknown } | undefined
    >;

    const kindField = fields?.kind;
    if (kindField && typeof kindField.value === 'string') {
      const parsed = kindSchema.safeParse(kindField.value);
      if (parsed.success) kind = parsed.data;
    }

    let source: AlbumSource | undefined;
    const sourceField = fields?.source;
    if (sourceField && typeof sourceField.value === 'string') {
      const parsed = sourceSchema.safeParse(sourceField.value);
      if (parsed.success) source = parsed.data;
    }

    let durationMs: number | null = null;
    const durationField = fields?.durationMs ?? fields?.duration_ms;
    if (durationField && typeof durationField.value === 'string') {
      const n = Number(durationField.value);
      if (Number.isFinite(n) && n > 0) durationMs = Math.trunc(n);
    }

    const mediaType = detectMediaType(data.mimetype, data.filename);
    if (!mediaType) {
      data.file.resume();
      return reply.code(400).send({
        error: 'unsupported_media',
        message: 'Image or short video required',
      });
    }

    if (mediaType === 'video' && durationMs != null && durationMs > VIDEO_MAX_DURATION_MS) {
      data.file.resume();
      return reply.code(400).send({
        error: 'video_too_long',
        message: `Max video length is ${VIDEO_MAX_DURATION_MS / 1000}s`,
        maxDurationMs: VIDEO_MAX_DURATION_MS,
      });
    }

    if (kind === 'profile' && mediaType !== 'photo') {
      data.file.resume();
      return reply.code(400).send({
        error: 'profile_photo_only',
        message: 'Profile upload accepts photos only',
      });
    }

    try {
      const saved = await saveUploadStream({
        kind,
        mediaType,
        stream: data.file,
        filename: data.filename,
        mimetype: data.mimetype,
      });

      if (!isAllowedUploadUrl(saved.relativeUrl)) {
        return reply.code(500).send({ error: 'invalid_url' });
      }

      // Always save chat/album/camera captures into the personal Findr album.
      // Profile photos also land in album for reuse.
      const album = await getAlbumStore();
      const albumItem = await album.add({
        userId: auth.userId,
        mediaType: saved.mediaType,
        url: saved.relativeUrl,
        mime: data.mimetype ?? null,
        bytes: saved.bytes,
        durationMs,
        source: sourceFromKind(kind, source ?? (kind === 'chat' ? 'chat' : undefined)),
      });

      if (kind === 'profile' && saved.mediaType === 'photo') {
        const store = await getProfileStore();
        const existing = await store.get(auth.userId);
        const displayName =
          existing?.displayName?.trim() ||
          auth.email.split('@')[0] ||
          'Findr user';
        const rest = (existing?.photoUrls ?? []).filter(
          (u) => u !== saved.relativeUrl,
        );
        const update: {
          displayName: string;
          bio?: string;
          genderIdentity?: string;
          orientationsShown?: string[];
          orientationsSeeking?: string[];
          lookingFor?: import('../modules/profiles/types.js').LookingFor[];
          photoUrls: string[];
          isVisible?: boolean;
          age?: number | null;
        } = {
          displayName,
          photoUrls: [saved.relativeUrl, ...rest].slice(0, 6),
        };
        if (existing?.bio !== undefined) update.bio = existing.bio;
        if (existing?.genderIdentity !== undefined) {
          update.genderIdentity = existing.genderIdentity;
        }
        if (existing?.orientationsShown) {
          update.orientationsShown = existing.orientationsShown;
        }
        if (existing?.orientationsSeeking) {
          update.orientationsSeeking = existing.orientationsSeeking;
        }
        if (existing?.lookingFor) update.lookingFor = existing.lookingFor;
        if (existing?.isVisible !== undefined) {
          update.isVisible = existing.isVisible;
        }
        if (existing?.age != null) update.age = existing.age;
        await store.upsert(auth.userId, update);
      }

      return {
        url: saved.relativeUrl,
        kind,
        mediaType: saved.mediaType,
        bytes: saved.bytes,
        durationMs,
        albumId: albumItem.id,
        limits: {
          photoMaxBytes: PHOTO_MAX_BYTES,
          videoMaxBytes: VIDEO_MAX_BYTES,
          videoMaxDurationMs: VIDEO_MAX_DURATION_MS,
        },
        todo: 'Play Store: move uploads to S3-compatible object storage + CDN',
      };
    } catch (err) {
      const code = (err as { code?: string }).code;
      const msg = err instanceof Error ? err.message : '';
      if (code === 'file_too_large' || msg.includes('file_too_large')) {
        const max =
          detectMediaType(data.mimetype, data.filename) === 'video'
            ? VIDEO_MAX_BYTES
            : PHOTO_MAX_BYTES;
        return reply.code(413).send({
          error: 'file_too_large',
          message: `Max ${Math.round(max / (1024 * 1024))}MB`,
          maxBytes: max,
        });
      }
      throw err;
    }
  });

  /** List the authenticated user's personal Findr album (newest first). */
  app.get('/album', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const q = z
      .object({ limit: z.coerce.number().int().min(1).max(200).optional() })
      .safeParse(req.query);
    const limit = q.success && q.data.limit ? q.data.limit : 100;

    const album = await getAlbumStore();
    const items = await album.listForUser(auth.userId, limit);
    return {
      items,
      limits: {
        photoMaxBytes: PHOTO_MAX_BYTES,
        videoMaxBytes: VIDEO_MAX_BYTES,
        videoMaxDurationMs: VIDEO_MAX_DURATION_MS,
      },
    };
  });

  /** Delete one album item owned by the current user (does not wipe chat history). */
  app.delete<{ Params: { id: string } }>('/album/:id', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_id' });
    }

    const album = await getAlbumStore();
    const ok = await album.deleteForUser(auth.userId, params.data.id);
    if (!ok) {
      return reply.code(404).send({ error: 'not_found' });
    }
    return { ok: true };
  });
};
