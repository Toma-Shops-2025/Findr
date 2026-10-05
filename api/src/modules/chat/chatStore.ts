import { randomUUID } from 'node:crypto';
import type pg from 'pg';

import { getPool } from '../db.js';
import {
  HELLO_ATTENTION_BODY,
  type HelloAttentionResult,
} from './helloAttention.js';
import type {
  ConversationRecord,
  MessageLocation,
  MessageRecord,
  MessageWithLikes,
  SendMessageInput,
} from './types.js';

function nowIso(): string {
  return new Date().toISOString();
}

/** Stable pair order so each 1:1 pair has a single conversation row. */
export function orderedPair(userId: string, peerId: string): [string, string] {
  return userId < peerId ? [userId, peerId] : [peerId, userId];
}

function messagePreview(input: SendMessageInput): string {
  const text = input.body.trim();
  if (text) return text.slice(0, 140);
  if (input.location) return '[Location]';
  if (input.videoUrl) return '[Video]';
  if (input.imageUrl) return '[Photo]';
  return '';
}

function rowToConversation(row: Record<string, unknown>): ConversationRecord {
  return {
    id: String(row.id),
    userAId: String(row.user_a_id),
    userBId: String(row.user_b_id),
    lastMessagePreview:
      row.last_message_preview == null ? null : String(row.last_message_preview),
    lastMessageAt:
      row.last_message_at instanceof Date
        ? row.last_message_at.toISOString()
        : row.last_message_at
          ? String(row.last_message_at)
          : null,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? nowIso()),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at ?? nowIso()),
  };
}

function locationFromRow(row: Record<string, unknown>): MessageLocation | null {
  if (row.location_lat == null || row.location_lng == null) return null;
  const lat = Number(row.location_lat);
  const lng = Number(row.location_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const sharedAt =
    row.location_shared_at instanceof Date
      ? row.location_shared_at.toISOString()
      : row.location_shared_at
        ? String(row.location_shared_at)
        : row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at ?? nowIso());
  return {
    lat,
    lng,
    accuracyM:
      row.location_accuracy_m == null || row.location_accuracy_m === ''
        ? null
        : Number(row.location_accuracy_m),
    sharedAt,
  };
}

function rowToMessage(row: Record<string, unknown>): MessageRecord {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    body: String(row.body ?? ''),
    imageUrl:
      row.image_url == null || row.image_url === ''
        ? null
        : String(row.image_url),
    videoUrl:
      row.video_url == null || row.video_url === ''
        ? null
        : String(row.video_url),
    location: locationFromRow(row),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? nowIso()),
  };
}

function withLikes(
  message: MessageRecord,
  likedByMe: boolean,
  likeCount: number,
): MessageWithLikes {
  return { ...message, likedByMe, likeCount };
}

function normalizeLocation(
  input: SendMessageInput['location'],
): MessageLocation | null {
  if (!input) return null;
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const accuracyRaw = input.accuracyM;
  const accuracyM =
    accuracyRaw == null || accuracyRaw === undefined
      ? null
      : Number(accuracyRaw);
  return {
    lat,
    lng,
    accuracyM:
      accuracyM != null && Number.isFinite(accuracyM) && accuracyM >= 0
        ? accuracyM
        : null,
    sharedAt: nowIso(),
  };
}

function utcDateKey(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

class MemoryChatStore {
  private conversations = new Map<string, ConversationRecord>();
  private pairIndex = new Map<string, string>();
  private messagesByConv = new Map<string, MessageRecord[]>();
  /** messageId -> set of userIds who liked */
  private likes = new Map<string, Set<string>>();
  /** sender:recipient:YYYY-MM-DD -> messageId (hello attention rate limit) */
  private helloAttentionDay = new Map<string, string>();

  private pairKey(a: string, b: string): string {
    const [x, y] = orderedPair(a, b);
    return `${x}:${y}`;
  }

  private likeMeta(messageId: string, viewerId: string) {
    const set = this.likes.get(messageId);
    return {
      likedByMe: Boolean(set?.has(viewerId)),
      likeCount: set?.size ?? 0,
    };
  }

  private assertMember(conversationId: string, userId: string): ConversationRecord {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw Object.assign(new Error('conversation_not_found'), {
        code: 'conversation_not_found',
      });
    }
    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw Object.assign(new Error('forbidden'), { code: 'forbidden' });
    }
    return conversation;
  }

  private findMessage(
    conversationId: string,
    messageId: string,
  ): MessageRecord {
    const list = this.messagesByConv.get(conversationId) ?? [];
    const message = list.find((m) => m.id === messageId);
    if (!message) {
      throw Object.assign(new Error('message_not_found'), {
        code: 'message_not_found',
      });
    }
    return message;
  }

  async listForUser(userId: string): Promise<ConversationRecord[]> {
    return [...this.conversations.values()]
      .filter((c) => c.userAId === userId || c.userBId === userId)
      .sort((a, b) => {
        const at = a.lastMessageAt ?? a.updatedAt;
        const bt = b.lastMessageAt ?? b.updatedAt;
        return bt.localeCompare(at);
      });
  }

  async getById(id: string): Promise<ConversationRecord | null> {
    return this.conversations.get(id) ?? null;
  }

  async findOrCreatePair(
    userId: string,
    peerId: string,
  ): Promise<{ conversation: ConversationRecord; created: boolean }> {
    const key = this.pairKey(userId, peerId);
    const existingId = this.pairIndex.get(key);
    if (existingId) {
      const existing = this.conversations.get(existingId);
      if (existing) return { conversation: existing, created: false };
    }

    const [userAId, userBId] = orderedPair(userId, peerId);
    const stamp = nowIso();
    const conversation: ConversationRecord = {
      id: randomUUID(),
      userAId,
      userBId,
      lastMessagePreview: null,
      lastMessageAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.conversations.set(conversation.id, conversation);
    this.pairIndex.set(key, conversation.id);
    this.messagesByConv.set(conversation.id, []);
    return { conversation, created: true };
  }

  async listMessages(
    conversationId: string,
    limit = 100,
    viewerId?: string,
  ): Promise<MessageWithLikes[]> {
    const all = this.messagesByConv.get(conversationId) ?? [];
    const slice = all.slice(-Math.max(1, Math.min(limit, 200)));
    return slice.map((m) => {
      const meta = this.likeMeta(m.id, viewerId ?? '');
      return withLikes(m, meta.likedByMe, meta.likeCount);
    });
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    input: SendMessageInput,
  ): Promise<MessageWithLikes> {
    const conversation = this.assertMember(conversationId, senderId);

    const body = input.body.trim();
    const imageUrl = input.imageUrl?.trim() || null;
    const videoUrl = input.videoUrl?.trim() || null;
    const location = normalizeLocation(input.location ?? null);
    if (!body && !imageUrl && !videoUrl && !location) {
      throw Object.assign(new Error('empty_message'), { code: 'empty_message' });
    }

    const message: MessageRecord = {
      id: randomUUID(),
      conversationId,
      senderId,
      body,
      imageUrl,
      videoUrl,
      location,
      createdAt: nowIso(),
    };
    const list = this.messagesByConv.get(conversationId) ?? [];
    list.push(message);
    this.messagesByConv.set(conversationId, list);

    conversation.lastMessagePreview = messagePreview({
      body,
      imageUrl,
      videoUrl,
      location: location
        ? { lat: location.lat, lng: location.lng, accuracyM: location.accuracyM }
        : null,
    });
    conversation.lastMessageAt = message.createdAt;
    conversation.updatedAt = message.createdAt;
    this.conversations.set(conversationId, conversation);

    return withLikes(message, false, 0);
  }

  async likeMessage(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<MessageWithLikes> {
    this.assertMember(conversationId, userId);
    const message = this.findMessage(conversationId, messageId);
    let set = this.likes.get(messageId);
    if (!set) {
      set = new Set();
      this.likes.set(messageId, set);
    }
    set.add(userId);
    const meta = this.likeMeta(messageId, userId);
    return withLikes(message, meta.likedByMe, meta.likeCount);
  }

  async unlikeMessage(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<MessageWithLikes> {
    this.assertMember(conversationId, userId);
    const message = this.findMessage(conversationId, messageId);
    this.likes.get(messageId)?.delete(userId);
    const meta = this.likeMeta(messageId, userId);
    return withLikes(message, meta.likedByMe, meta.likeCount);
  }

  async sendHelloAttention(
    senderId: string,
    peerUserId: string,
  ): Promise<HelloAttentionResult & { conversation: ConversationRecord }> {
    const { conversation, created } = await this.findOrCreatePair(
      senderId,
      peerUserId,
    );
    const existing = this.messagesByConv.get(conversation.id) ?? [];
    if (existing.length > 0) {
      const lastMessage = existing[existing.length - 1]!;
      return {
        conversation,
        conversationId: conversation.id,
        messageId: lastMessage.id,
        created,
        sent: false,
      };
    }

    const dayKey = `${senderId}:${peerUserId}:${utcDateKey()}`;
    if (this.helloAttentionDay.has(dayKey)) {
      throw Object.assign(new Error('hello_rate_limited'), {
        code: 'hello_rate_limited',
      });
    }

    const message = await this.sendMessage(conversation.id, senderId, {
      body: HELLO_ATTENTION_BODY,
    });
    this.helloAttentionDay.set(dayKey, message.id);
    return {
      conversation,
      conversationId: conversation.id,
      messageId: message.id,
      created,
      sent: true,
    };
  }
}

class PostgresChatStore {
  constructor(private pool: pg.Pool) {}

  async listForUser(userId: string): Promise<ConversationRecord[]> {
    const result = await this.pool.query(
      `SELECT id, user_a_id, user_b_id, last_message_preview, last_message_at,
              created_at, updated_at
       FROM conversations
       WHERE user_a_id = $1 OR user_b_id = $1
       ORDER BY COALESCE(last_message_at, updated_at) DESC`,
      [userId],
    );
    return result.rows.map(rowToConversation);
  }

  async getById(id: string): Promise<ConversationRecord | null> {
    const result = await this.pool.query(
      `SELECT id, user_a_id, user_b_id, last_message_preview, last_message_at,
              created_at, updated_at
       FROM conversations
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? rowToConversation(row) : null;
  }

  async findOrCreatePair(
    userId: string,
    peerId: string,
  ): Promise<{ conversation: ConversationRecord; created: boolean }> {
    const [userAId, userBId] = orderedPair(userId, peerId);
    const existing = await this.pool.query(
      `SELECT id, user_a_id, user_b_id, last_message_preview, last_message_at,
              created_at, updated_at
       FROM conversations
       WHERE user_a_id = $1 AND user_b_id = $2
       LIMIT 1`,
      [userAId, userBId],
    );
    if (existing.rows[0]) {
      return { conversation: rowToConversation(existing.rows[0]), created: false };
    }

    const inserted = await this.pool.query(
      `INSERT INTO conversations (user_a_id, user_b_id)
       VALUES ($1, $2)
       ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET updated_at = conversations.updated_at
       RETURNING id, user_a_id, user_b_id, last_message_preview, last_message_at,
                 created_at, updated_at`,
      [userAId, userBId],
    );
    const wasInsert = inserted.rowCount === 1 && !existing.rows[0];
    return {
      conversation: rowToConversation(inserted.rows[0]),
      created: wasInsert,
    };
  }

  private async assertMember(
    client: pg.PoolClient | pg.Pool,
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conv = await client.query(
      `SELECT id, user_a_id, user_b_id FROM conversations WHERE id = $1`,
      [conversationId],
    );
    const row = conv.rows[0];
    if (!row) {
      throw Object.assign(new Error('conversation_not_found'), {
        code: 'conversation_not_found',
      });
    }
    if (row.user_a_id !== userId && row.user_b_id !== userId) {
      throw Object.assign(new Error('forbidden'), { code: 'forbidden' });
    }
  }

  async listMessages(
    conversationId: string,
    limit = 100,
    viewerId?: string,
  ): Promise<MessageWithLikes[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    const result = await this.pool.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.image_url, m.video_url,
              m.location_lat, m.location_lng, m.location_accuracy_m, m.location_shared_at,
              m.created_at,
              COALESCE(lc.cnt, 0)::int AS like_count,
              CASE
                WHEN $3::uuid IS NULL THEN false
                ELSE EXISTS (
                  SELECT 1 FROM message_likes ml
                  WHERE ml.message_id = m.id AND ml.user_id = $3::uuid
                )
              END AS liked_by_me
       FROM messages m
       LEFT JOIN (
         SELECT message_id, COUNT(*)::int AS cnt
         FROM message_likes
         GROUP BY message_id
       ) lc ON lc.message_id = m.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2`,
      [conversationId, capped, viewerId ?? null],
    );
    return result.rows.map((row) =>
      withLikes(
        rowToMessage(row),
        Boolean(row.liked_by_me),
        Number(row.like_count ?? 0),
      ),
    );
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    input: SendMessageInput,
  ): Promise<MessageWithLikes> {
    const body = input.body.trim();
    const imageUrl = input.imageUrl?.trim() || null;
    const videoUrl = input.videoUrl?.trim() || null;
    const location = normalizeLocation(input.location ?? null);
    if (!body && !imageUrl && !videoUrl && !location) {
      throw Object.assign(new Error('empty_message'), { code: 'empty_message' });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.assertMember(client, conversationId, senderId);

      const inserted = await client.query(
        `INSERT INTO messages (
           conversation_id, sender_id, body, image_url, video_url,
           location_lat, location_lng, location_accuracy_m, location_shared_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, conversation_id, sender_id, body, image_url, video_url,
                   location_lat, location_lng, location_accuracy_m, location_shared_at,
                   created_at`,
        [
          conversationId,
          senderId,
          body,
          imageUrl,
          videoUrl,
          location?.lat ?? null,
          location?.lng ?? null,
          location?.accuracyM ?? null,
          location?.sharedAt ?? null,
        ],
      );
      const preview = messagePreview({
        body,
        imageUrl,
        videoUrl,
        location: location
          ? { lat: location.lat, lng: location.lng, accuracyM: location.accuracyM }
          : null,
      });
      await client.query(
        `UPDATE conversations
         SET last_message_preview = $2,
             last_message_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [conversationId, preview],
      );
      await client.query('COMMIT');
      return withLikes(rowToMessage(inserted.rows[0]), false, 0);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async loadMessageWithLikes(
    conversationId: string,
    messageId: string,
    viewerId: string,
  ): Promise<MessageWithLikes> {
    const result = await this.pool.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.image_url, m.video_url,
              m.location_lat, m.location_lng, m.location_accuracy_m, m.location_shared_at,
              m.created_at,
              (SELECT COUNT(*)::int FROM message_likes ml WHERE ml.message_id = m.id) AS like_count,
              EXISTS (
                SELECT 1 FROM message_likes ml2
                WHERE ml2.message_id = m.id AND ml2.user_id = $3
              ) AS liked_by_me
       FROM messages m
       WHERE m.id = $1 AND m.conversation_id = $2
       LIMIT 1`,
      [messageId, conversationId, viewerId],
    );
    const row = result.rows[0];
    if (!row) {
      throw Object.assign(new Error('message_not_found'), {
        code: 'message_not_found',
      });
    }
    return withLikes(
      rowToMessage(row),
      Boolean(row.liked_by_me),
      Number(row.like_count ?? 0),
    );
  }

  async likeMessage(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<MessageWithLikes> {
    await this.assertMember(this.pool, conversationId, userId);
    const exists = await this.pool.query(
      `SELECT id FROM messages WHERE id = $1 AND conversation_id = $2 LIMIT 1`,
      [messageId, conversationId],
    );
    if (!exists.rows[0]) {
      throw Object.assign(new Error('message_not_found'), {
        code: 'message_not_found',
      });
    }
    await this.pool.query(
      `INSERT INTO message_likes (message_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [messageId, userId],
    );
    return this.loadMessageWithLikes(conversationId, messageId, userId);
  }

  async unlikeMessage(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<MessageWithLikes> {
    await this.assertMember(this.pool, conversationId, userId);
    const exists = await this.pool.query(
      `SELECT id FROM messages WHERE id = $1 AND conversation_id = $2 LIMIT 1`,
      [messageId, conversationId],
    );
    if (!exists.rows[0]) {
      throw Object.assign(new Error('message_not_found'), {
        code: 'message_not_found',
      });
    }
    await this.pool.query(
      `DELETE FROM message_likes WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId],
    );
    return this.loadMessageWithLikes(conversationId, messageId, userId);
  }

  async sendHelloAttention(
    senderId: string,
    peerUserId: string,
  ): Promise<HelloAttentionResult & { conversation: ConversationRecord }> {
    const { conversation, created } = await this.findOrCreatePair(
      senderId,
      peerUserId,
    );

    const countResult = await this.pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM messages WHERE conversation_id = $1`,
      [conversation.id],
    );
    const messageCount = Number(countResult.rows[0]?.n ?? '0');
    if (messageCount > 0) {
      const last = await this.pool.query<{ id: string }>(
        `SELECT id FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [conversation.id],
      );
      const lastId = last.rows[0]?.id;
      return {
        conversation,
        conversationId: conversation.id,
        messageId: lastId ? String(lastId) : '',
        created,
        sent: false,
      };
    }

    const rate = await this.pool.query(
      `SELECT 1
       FROM hello_attentions
       WHERE sender_id = $1
         AND recipient_id = $2
         AND (timezone('UTC', created_at))::date = (timezone('UTC', now()))::date
       LIMIT 1`,
      [senderId, peerUserId],
    );
    if (rate.rows[0]) {
      throw Object.assign(new Error('hello_rate_limited'), {
        code: 'hello_rate_limited',
      });
    }

    const message = await this.sendMessage(conversation.id, senderId, {
      body: HELLO_ATTENTION_BODY,
    });
    try {
      await this.pool.query(
        `INSERT INTO hello_attentions
           (sender_id, recipient_id, conversation_id, message_id)
         VALUES ($1, $2, $3, $4)`,
        [senderId, peerUserId, conversation.id, message.id],
      );
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === '23505') {
        throw Object.assign(new Error('hello_rate_limited'), {
          code: 'hello_rate_limited',
        });
      }
      throw err;
    }
    const refreshed = await this.getById(conversation.id);
    return {
      conversation: refreshed ?? conversation,
      conversationId: conversation.id,
      messageId: message.id,
      created,
      sent: true,
    };
  }
}

export type ChatStore = MemoryChatStore | PostgresChatStore;

let storePromise: Promise<ChatStore> | null = null;

export async function getChatStore(): Promise<ChatStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) {
        console.warn(
          '[findr-api] chat store: in-memory (set DATABASE_URL + apply 002_chat.sql for Postgres)',
        );
        return new MemoryChatStore();
      }
      return new PostgresChatStore(pool);
    })();
  }
  return storePromise;
}
