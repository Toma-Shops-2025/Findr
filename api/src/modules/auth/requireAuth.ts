import type { FastifyReply, FastifyRequest } from 'fastify';

import { bearerToken, verifyAccessToken } from './jwt.js';
import { getUserStore, type PublicUser, toPublic } from './userStore.js';

export type AuthContext = {
  userId: string;
  email: string;
  user: PublicUser;
};

/**
 * Require a valid Bearer JWT and a live user record.
 * Sends 401 and returns null when auth fails.
 */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthContext | null> {
  const token = bearerToken(req.headers.authorization);
  if (!token) {
    await reply.code(401).send({ error: 'unauthorized' });
    return null;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    await reply.code(401).send({ error: 'unauthorized' });
    return null;
  }

  const store = await getUserStore();
  const user = await store.findById(payload.sub);
  if (!user) {
    await reply.code(401).send({ error: 'unauthorized' });
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    user: toPublic(user),
  };
}
