import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../modules/auth/requireAuth.js';
import { getUserStore } from '../modules/auth/userStore.js';
import { getChatStore } from '../modules/chat/chatStore.js';
import type {
  ConversationRecord,
  ConversationSummary,
  PublicMessage,
} from '../modules/chat/types.js';
import { getProfileStore } from '../modules/profiles/profileStore.js';
import { getBlockStore } from '../modules/safety/blockStore.js';

/**
 * First-party 1:1 chat (MVP).
 * TODO: buy-vs-build — Stream Chat / Ably / Firebase; mint short-lived vendor tokens.
 * Persistence: Postgres when DATABASE_URL + migrations applied; else in-memory.
 * Photo messages: body and/or imageUrl (relative /uploads/… or http(s)).
 */

function peerId(conversation: ConversationRecord, me: string): string {
  return conversation.userAId === me ? conversation.userBId : conversation.userAId;
}

async function peerDisplayName(peerUserId: string): Promise<string> {
  const profiles = await getProfileStore();
  const profile = await profiles.get(peerUserId);
  if (profile?.displayName?.trim()) return profile.displayName.trim();
  const users = await getUserStore();
  const user = await users.findById(peerUserId);
  return user?.email?.split('@')[0] ?? 'Findr user';
}

async function toSummary(
  conversation: ConversationRecord,
  me: string,
): Promise<ConversationSummary> {
  const other = peerId(conversation, me);
  return {
    id: conversation.id,
    peerUserId: other,
    peerDisplayName: await peerDisplayName(other),
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt,
    updatedAt: conversation.updatedAt,
  };
}

function toPublicMessage(
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    imageUrl: string | null;
    videoUrl: string | null;
    createdAt: string;
  },
  me: string,
): PublicMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    imageUrl: message.imageUrl,
    videoUrl: message.videoUrl,
    createdAt: message.createdAt,
    mine: message.senderId === me,
  };
}

const openSchema = z.object({
  peerUserId: z.string().uuid().or(z.string().min(1).max(80)),
});

const mediaUrlRefine = (u: string | null | undefined) =>
  u == null ||
  u === '' ||
  u.startsWith('/uploads/') ||
  u.startsWith('https://') ||
  u.startsWith('http://');

const sendSchema = z
  .object({
    body: z.string().max(2000).optional().default(''),
    imageUrl: z
      .string()
      .max(500)
      .optional()
      .refine(mediaUrlRefine, { message: 'imageUrl must be /uploads/… or http(s)' }),
    videoUrl: z
      .string()
      .max(500)
      .optional()
      .refine(mediaUrlRefine, { message: 'videoUrl must be /uploads/… or http(s)' }),
  })
  .refine(
    (data) =>
      (data.body?.trim()?.length ?? 0) > 0 ||
      Boolean(data.imageUrl?.trim()) ||
      Boolean(data.videoUrl?.trim()),
    { message: 'body, imageUrl, or videoUrl required' },
  );

/**
 * Resolve a conversation for the current user.
 * Accepts either a real conversation UUID OR a peer userId (compat for
 * older mobile builds that navigated to `/chat/${peerUserId}`).
 */
async function resolveConversationForUser(
  me: string,
  idOrPeer: string,
): Promise<
  | { ok: true; conversation: ConversationRecord; created: boolean }
  | { ok: false; status: 400 | 403 | 404; error: string; message?: string }
> {
  const store = await getChatStore();
  const existing = await store.getById(idOrPeer);
  if (existing) {
    if (existing.userAId !== me && existing.userBId !== me) {
      return { ok: false, status: 403, error: 'forbidden' };
    }
    return { ok: true, conversation: existing, created: false };
  }

  // Compat: treat unknown id as peer userId and find-or-create the 1:1 thread.
  if (idOrPeer === me) {
    return { ok: false, status: 400, error: 'cannot_chat_self' };
  }
  const users = await getUserStore();
  const peer = await users.findById(idOrPeer);
  if (!peer) {
    return { ok: false, status: 404, error: 'conversation_not_found' };
  }

  const blocks = await getBlockStore();
  const blocked = await blocks.blockedPairIds(me);
  if (blocked.has(idOrPeer)) {
    return {
      ok: false,
      status: 403,
      error: 'blocked',
      message: 'Cannot chat with a blocked user',
    };
  }

  const { conversation, created } = await store.findOrCreatePair(me, idOrPeer);
  return { ok: true, conversation, created };
}

export const chatRoutes: FastifyPluginAsync = async (app) => {
  app.post('/token', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;
    return reply.code(501).send({
      error: 'not_implemented',
      message: 'TODO: issue chat vendor token for current user',
    });
  });

  app.get('/conversations', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const [store, blocks] = await Promise.all([getChatStore(), getBlockStore()]);
    const blocked = await blocks.blockedPairIds(auth.userId);
    const all = await store.listForUser(auth.userId);
    const visible = all.filter((c) => !blocked.has(peerId(c, auth.userId)));
    const conversations = await Promise.all(
      visible.map((c) => toSummary(c, auth.userId)),
    );

    const poolHint = process.env.DATABASE_URL
      ? undefined
      : 'memory';
    return {
      conversations,
      mode: poolHint,
      todo: poolHint
        ? 'Set DATABASE_URL and apply db/migrations/002_chat.sql for durable chat'
        : undefined,
    };
  });

  app.post('/conversations', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;

    const parsed = openSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_body',
        details: parsed.error.flatten(),
      });
    }

    const peerUserId = parsed.data.peerUserId;
    if (peerUserId === auth.userId) {
      return reply.code(400).send({ error: 'cannot_chat_self' });
    }

    const users = await getUserStore();
    const peer = await users.findById(peerUserId);
    if (!peer) {
      return reply.code(404).send({ error: 'peer_not_found' });
    }

    const blocks = await getBlockStore();
    const blocked = await blocks.blockedPairIds(auth.userId);
    if (blocked.has(peerUserId)) {
      return reply.code(403).send({
        error: 'blocked',
        message: 'Cannot chat with a blocked user',
      });
    }

    const store = await getChatStore();
    const { conversation, created } = await store.findOrCreatePair(
      auth.userId,
      peerUserId,
    );

    return {
      conversation: await toSummary(conversation, auth.userId),
      created,
    };
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/conversations/:id',
    async (req, reply) => {
      const auth = await requireAuth(req, reply);
      if (!auth) return;

      const resolved = await resolveConversationForUser(
        auth.userId,
        req.params.id,
      );
      if (!resolved.ok) {
        return reply.code(resolved.status).send({
          error: resolved.error,
          message: resolved.message,
        });
      }

      const { conversation } = resolved;
      const other = peerId(conversation, auth.userId);
      const blocks = await getBlockStore();
      const blocked = await blocks.blockedPairIds(auth.userId);
      if (blocked.has(other)) {
        return reply.code(403).send({
          error: 'blocked',
          message: 'Conversation hidden due to block',
        });
      }

      return {
        conversation: await toSummary(conversation, auth.userId),
        created: resolved.created,
      };
    },
  );

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/conversations/:id/messages',
    async (req, reply) => {
      const auth = await requireAuth(req, reply);
      if (!auth) return;

      const resolved = await resolveConversationForUser(
        auth.userId,
        req.params.id,
      );
      if (!resolved.ok) {
        return reply.code(resolved.status).send({
          error: resolved.error,
          message: resolved.message,
        });
      }

      const { conversation } = resolved;
      const other = peerId(conversation, auth.userId);
      const blocks = await getBlockStore();
      const blocked = await blocks.blockedPairIds(auth.userId);
      if (blocked.has(other)) {
        return reply.code(403).send({ error: 'blocked' });
      }

      const store = await getChatStore();
      const limit = Number(req.query.limit ?? 100);
      const messages = await store.listMessages(
        conversation.id,
        Number.isFinite(limit) ? limit : 100,
      );

      return {
        conversationId: conversation.id,
        messages: messages.map((m) => toPublicMessage(m, auth.userId)),
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/conversations/:id/messages',
    async (req, reply) => {
      const auth = await requireAuth(req, reply);
      if (!auth) return;

      const parsed = sendSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'invalid_body',
          details: parsed.error.flatten(),
        });
      }

      const resolved = await resolveConversationForUser(
        auth.userId,
        req.params.id,
      );
      if (!resolved.ok) {
        return reply.code(resolved.status).send({
          error: resolved.error,
          message: resolved.message,
        });
      }

      const { conversation } = resolved;
      const other = peerId(conversation, auth.userId);
      const blocks = await getBlockStore();
      const blocked = await blocks.blockedPairIds(auth.userId);
      if (blocked.has(other)) {
        return reply.code(403).send({
          error: 'blocked',
          message: 'Cannot message a blocked user',
        });
      }

      const store = await getChatStore();
      try {
        const message = await store.sendMessage(conversation.id, auth.userId, {
          body: parsed.data.body ?? '',
          imageUrl: parsed.data.imageUrl?.trim() || null,
          videoUrl: parsed.data.videoUrl?.trim() || null,
        });
        return { message: toPublicMessage(message, auth.userId) };
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'conversation_not_found') {
          return reply.code(404).send({ error: 'conversation_not_found' });
        }
        if (code === 'forbidden') {
          return reply.code(403).send({ error: 'forbidden' });
        }
        if (code === 'empty_message') {
          return reply.code(400).send({ error: 'empty_message' });
        }
        throw err;
      }
    },
  );

  // Back-compat stub alias from scaffold.
  app.get('/threads', async (req, reply) => {
    const auth = await requireAuth(req, reply);
    if (!auth) return;
    // Redirect shape: prefer /conversations
    const store = await getChatStore();
    const blocks = await getBlockStore();
    const blocked = await blocks.blockedPairIds(auth.userId);
    const all = await store.listForUser(auth.userId);
    const threads = await Promise.all(
      all
        .filter((c) => !blocked.has(peerId(c, auth.userId)))
        .map((c) => toSummary(c, auth.userId)),
    );
    return { threads, conversations: threads };
  });
};
