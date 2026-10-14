import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../modules/auth/requireAuth.js';
import { getDeviceStore } from '../modules/push/deviceStore.js';

const tokenSchema = z.object({
  expoPushToken: z.string().min(10).max(200),
  platform: z.enum(['android', 'ios']).optional(),
});

export const deviceRoutes: FastifyPluginAsync = async (app) => {
  app.post('/push-token', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const store = await getDeviceStore();
    await store.upsert(
      auth.userId,
      parsed.data.expoPushToken,
      parsed.data.platform ?? 'android',
    );
    return { ok: true };
  });

  app.delete('/push-token', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body' });
    }

    const store = await getDeviceStore();
    await store.remove(auth.userId, parsed.data.expoPushToken);
    return { ok: true };
  });
};
