import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../modules/auth/requireAuth.js';
import { getUserStore } from '../modules/auth/userStore.js';
import { getBlockStore } from '../modules/safety/blockStore.js';

const blockSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1).max(80)),
});

const reportSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1).max(80)),
  reason: z.string().trim().min(1).max(200),
  details: z.string().max(2000).optional(),
});

/** Block / report — safety is a day-one product requirement. */
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
