import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { isAdult } from '../modules/auth/ageGate.js';
import { signAccessToken } from '../modules/auth/jwt.js';
import { requireAuth } from '../modules/auth/requireAuth.js';
import {
  getUserStore,
  toPublic,
  verifyPassword,
} from '../modules/auth/userStore.js';
import { verifyGoogleIdToken } from '../modules/auth/googleToken.js';
import {
  completePasswordReset,
  requestPasswordReset,
} from '../modules/auth/passwordReset.js';
import { getLocationStore } from '../modules/geo/locationStore.js';
import { getProfileStore } from '../modules/profiles/profileStore.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  /** Optional â€” when omitted, acceptedAgeGate must be true (MVP). */
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  acceptedAgeGate: z.literal(true),
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
 * Hard gate: acceptedAgeGate (18+ attestation). Optional DOB still validated if sent.
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
      const signupInput = {
        email: parsed.data.email,
        password: parsed.data.password,
        acceptedAgeGate: parsed.data.acceptedAgeGate,
        tosAccepted: parsed.data.tosAccepted,
        privacyAccepted: parsed.data.privacyAccepted,
        ...(parsed.data.dateOfBirth
          ? { dateOfBirth: parsed.data.dateOfBirth }
          : {}),
      };
      const user = await store.create(signupInput);
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
      if (code === 'underage' || code === 'age_gate_required') {
        return reply.code(403).send({
          error: code === 'age_gate_required' ? 'age_gate_required' : 'underage',
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

  app.post('/forgot-password', async (req, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'invalid_body' });
    }
    await requestPasswordReset(body.data.email);
    return {
      ok: true,
      message: 'If an account exists, we sent reset instructions.',
    };
  });

  app.post('/reset-password', async (req, reply) => {
    const body = z
      .object({
        token: z.string().min(20),
        password: z.string().min(8),
      })
      .safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'invalid_body' });
    }
    const result = await completePasswordReset(
      body.data.token,
      body.data.password,
    );
    if (result === 'weak') {
      return reply.code(400).send({ error: 'password_too_short' });
    }
    if (result === 'invalid') {
      return reply.code(400).send({ error: 'invalid_or_expired_token' });
    }
    return { ok: true };
  });

  app.post('/google', async (req, reply) => {
    const body = z
      .object({
        idToken: z.string().min(20),
        acceptedAgeGate: z.literal(true),
        tosAccepted: z.literal(true),
        privacyAccepted: z.literal(true),
      })
      .safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'invalid_body' });
    }

    const profile = await verifyGoogleIdToken(body.data.idToken);
    if (!profile || !profile.emailVerified) {
      return reply.code(401).send({ error: 'invalid_google_token' });
    }

    const store = await getUserStore();
    try {
      const user = await store.upsertGoogleUser({
        googleSub: profile.sub,
        email: profile.email,
        acceptedAgeGate: true,
        tosAccepted: true,
        privacyAccepted: true,
      });
      const accessToken = await signAccessToken({
        sub: user.id,
        email: user.email,
      });
      return { accessToken, user };
    } catch (err) {
      const code = errorCode(err);
      if (code === 'email_taken') {
        return reply.code(409).send({
          error: 'email_taken',
          message: 'An account with this email already exists. Log in with email/password.',
        });
      }
      throw err;
    }
  });

  app.post('/logout', async (_req, reply) => {
    // Stateless JWT â€” client clears SecureStore. Endpoint kept for symmetry / future revoke list.
    return reply.send({ ok: true });
  });

  app.get('/me', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;
    return { user: auth.user };
  });

  /**
   * Soft-delete the signed-in account (Play Store account deletion).
   * Scrubs profile + removes coarse location; JWT remains until client clears it.
   */
  app.delete('/me', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const users = await getUserStore();
    const profiles = await getProfileStore();
    const { store: locations } = await getLocationStore();

    try {
      await profiles.scrubDeleted(auth.userId);
    } catch (err) {
      req.log.warn({ err, userId: auth.userId }, 'profile scrub on delete failed');
    }
    try {
      await locations.remove(auth.userId);
    } catch (err) {
      req.log.warn({ err, userId: auth.userId }, 'location remove on delete failed');
    }

    const ok = await users.softDelete(auth.userId);
    if (!ok) {
      return reply.code(404).send({ error: 'not_found' });
    }
    return { ok: true, deleted: true };
  });

  app.post('/age-gate', async (req, reply) => {
    const body = (req.body ?? {}) as {
      dateOfBirth?: string;
      acceptedAgeGate?: boolean;
    };
    if (body.acceptedAgeGate === true && !body.dateOfBirth) {
      return {
        eligible: true,
        message: 'Eligible for Findr (18+ attestation).',
      };
    }
    if (!body.dateOfBirth) {
      return reply.code(400).send({ error: 'dateOfBirth_or_acceptedAgeGate_required' });
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
