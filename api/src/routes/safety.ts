import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../modules/auth/requireAuth.js';
import { getUserStore } from '../modules/auth/userStore.js';
import { sanitizeDisplayNameForPublic } from '../modules/profiles/publicDisplay.js';
import { getProfileStore } from '../modules/profiles/profileStore.js';
import { getBlockStore } from '../modules/safety/blockStore.js';

const blockSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1).max(80)),
});

const reportSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1).max(80)),
  reason: z.string().trim().min(1).max(200),
  details: z.string().max(2000).optional(),
});

/** Block / report - safety is a day-one product requirement. */
export const safetyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/block', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const blockedId = parsed.data.userId;
    if (blockedId === auth.userId) {
      return reply.code(400).send({ error: 'cannot_block_self' });
    }

    const users = await getUserStore();
    const peer = await users.findById(blockedId);
    if (!peer) {
      return reply.code(404).send({ error: 'user_not_found' });
    }

    const store = await getBlockStore();
    await store.addBlock(auth.userId, blockedId);

    return { ok: true, blockedUserId: blockedId };
  });

  /** List users I blocked (for Settings unblock UI). */
  app.get('/blocks', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const store = await getBlockStore();
    const profiles = await getProfileStore();
    const edges = await store.listBlocks(auth.userId);

    const blocks = await Promise.all(
      edges.map(async (edge) => {
        const profile = await profiles.get(edge.blockedUserId);
        return {
          userId: edge.blockedUserId,
          displayName:
            sanitizeDisplayNameForPublic(
              profile?.displayName?.trim() || 'Findr user',
            ) || 'Findr user',
          createdAt: edge.createdAt,
        };
      }),
    );

    return { blocks };
  });

  /** Create block via /safety/blocks (alias of POST /safety/block). */
  app.post('/blocks', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const blockedId = parsed.data.userId;
    if (blockedId === auth.userId) {
      return reply.code(400).send({ error: 'cannot_block_self' });
    }

    const users = await getUserStore();
    const peer = await users.findById(blockedId);
    if (!peer) {
      return reply.code(404).send({ error: 'user_not_found' });
    }

    const store = await getBlockStore();
    await store.addBlock(auth.userId, blockedId);

    return { ok: true, blockedUserId: blockedId };
  });

  app.post('/unblock', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const blockedId = parsed.data.userId;
    const store = await getBlockStore();
    const removed = await store.removeBlock(auth.userId, blockedId);
    if (!removed) {
      return reply.code(404).send({ error: 'block_not_found' });
    }

    return { ok: true, unblockedUserId: blockedId };
  });

  /** DELETE /safety/blocks with { userId } - alias of POST /safety/unblock. */
  app.delete('/blocks', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const blockedId = parsed.data.userId;
    const store = await getBlockStore();
    const removed = await store.removeBlock(auth.userId, blockedId);
    if (!removed) {
      return reply.code(404).send({ error: 'block_not_found' });
    }

    return { ok: true, unblockedUserId: blockedId };
  });

  app.post('/report', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    // MVP: accept report payload; admin queue / persistence is later.
    return {
      ok: true,
      status: 'received',
      todo: 'Persist report + evidence snapshot for admin queue',
      targetUserId: parsed.data.userId,
      reason: parsed.data.reason,
    };
  });
};