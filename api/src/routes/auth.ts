import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { isAdult } from '../modules/auth/ageGate.js';
import {
  bearerToken,
  signAccessToken,
  verifyAccessToken,
} from '../modules/auth/jwt.js';
import {
  getUserStore,
  toPublic,
  verifyPassword,
} from '../modules/auth/userStore.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tosAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function errorCode(err: unknown): string | undefined {
  return (err as { code?: string })?.code;
}

/**
 * MVP email/password auth with JWT.
 * Hard gate: DOB → 18+ before creating an account.
 * TODO: optionally swap to Clerk / Supabase Auth / Firebase Auth later.
 */
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/signup', async (req, reply) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const store = await getUserStore();
    try {
      const user = await store.create(parsed.data);
      const accessToken = await signAccessToken({
        sub: user.id,
        email: user.email,
      });
      return reply.code(201).send({ accessToken, user });
    } catch (err) {
      const code = errorCode(err);
      if (code === 'email_taken') {
        return reply.code(409).send({ error: 'email_taken' });
      }
      if (code === 'underage') {
        return reply.code(403).send({
          error: 'underage',
          message: 'Findr is for adults 18+ only.',
        });
      }
      if (code === 'legal_required') {
        return reply.code(400).send({ error: 'legal_required' });
      }
      if (code === 'password_too_short') {
        return reply.code(400).send({ error: 'password_too_short' });
      }
      throw err;
    }
  });

  app.post('/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const store = await getUserStore();
    const user = await store.findByEmail(parsed.data.email);
    if (!user || !(await verifyPassword(user, parsed.data.password))) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
    });
    return { accessToken, user: toPublic(user) };
  });

  app.post('/logout', async (_req, reply) => {
    // Stateless JWT — client clears SecureStore. Endpoint kept for symmetry / future revoke list.
    return reply.send({ ok: true });
  });

  app.get('/me', async (req, reply) => {
    const token = bearerToken(req.headers.authorization);
    if (!token) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    const store = await getUserStore();
    const user = await store.findById(payload.sub);
    if (!user) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    return { user: toPublic(user) };
  });

  app.post('/age-gate', async (req, reply) => {
    const body = (req.body ?? {}) as { dateOfBirth?: string };
    if (!body.dateOfBirth) {
      return reply.code(400).send({ error: 'dateOfBirth_required' });
    }
    const eligible = isAdult(body.dateOfBirth);
    return {
      eligible,
      message: eligible
        ? 'Eligible for Findr (18+).'
        : 'Findr is for adults 18+ only.',
    };
  });
};
