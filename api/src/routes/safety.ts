import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../modules/auth/requireAuth.js';
import { getUserStore } from '../modules/auth/userStore.js';
import { getProfileStore } from '../modules/profiles/profileStore.js';
import { getBlockStore } from '../modules/safety/blockStore.js';
import { notifySafetyReport } from '../modules/safety/notify.js';
import {
  getReportStore,
  parseReportReason,
} from '../modules/safety/reportStore.js';

const blockSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1).max(80)),
});

const reportSchema = z.object({
  userId: z.string().uuid().or(z.string().min(1).max(80)),
  reason: z.string().trim().min(1).max(200),
  details: z.string().max(2000).optional(),
  contentType: z.enum(['user', 'message', 'profile', 'photo']).optional(),
  contentId: z.string().max(200).optional(),
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
          displayName: profile?.displayName?.trim() || 'Findr user',
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

    const reason = parseReportReason(parsed.data.reason);
    if (!reason) {
      return reply.code(400).send({ error: 'invalid_reason' });
    }

    const targetUserId = parsed.data.userId;
    if (targetUserId === auth.userId) {
      return reply.code(400).send({ error: 'cannot_report_self' });
    }

    const users = await getUserStore();
    const peer = await users.findById(targetUserId);
    if (!peer) {
      return reply.code(404).send({ error: 'user_not_found' });
    }

    const reports = await getReportStore();
    const evidence: { contentType?: string; contentId?: string } = {};
    if (parsed.data.contentType) evidence.contentType = parsed.data.contentType;
    if (parsed.data.contentId) evidence.contentId = parsed.data.contentId;

    const created = await reports.create({
      reporterId: auth.userId,
      targetUserId,
      reason,
      ...(parsed.data.details !== undefined ? { details: parsed.data.details } : {}),
      evidence,
    });

    void notifySafetyReport(created, req.log);

    return reply.code(201).send({
      ok: true,
      status: 'received',
      reportId: created.id,
    });
  });
};