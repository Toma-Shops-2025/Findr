import { randomUUID } from 'node:crypto';
import type pg from 'pg';

import { getPool } from '../db.js';
import type { ConversationRecord, MessageRecord } from './types.js';

function nowIso(): string {
  return new Date().toISOString();
}

/** Stable pair order so each 1:1 pair has a single conversation row. */
export function orderedPair(userId: string, peerId: string): [string, string] {
  return userId < peerId ? [userId, peerId] : [peerId, userId];
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

function rowToMessage(row: Record<string, unknown>): MessageRecord {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    body: String(row.body ?? ''),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? nowIso()),
  };
}

class MemoryChatStore {
  private conversations = new Map<string, ConversationRecord>();
  /** key: orderedPair joined */
  private pairIndex = new Map<string, string>();
  private messagesByConv = new Map<string, MessageRecord[]>();

  private pairKey(a: string, b: string): string {
    const [x, y] = orderedPair(a, b);
    return `${x}:${y}`;
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
  ): Promise<MessageRecord[]> {
    const all = this.messagesByConv.get(conversationId) ?? [];
    return all.slice(-Math.max(1, Math.min(limit, 200)));
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
  ): Promise<MessageRecord> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw Object.assign(new Error('conversation_not_found'), {
        code: 'conversation_not_found',
      });
    }
    if (conversation.userAId !== senderId && conversation.userBId !== senderId) {
      throw Object.assign(new Error('forbidden'), { code: 'forbidden' });
    }

    const message: MessageRecord = {
      id: randomUUID(),
      conversationId,
      senderId,
      body,
      createdAt: nowIso(),
    };
    const list = this.messagesByConv.get(conversationId) ?? [];
    list.push(message);
    this.messagesByConv.set(conversationId, list);

    conversation.lastMessagePreview = body.slice(0, 140);
    conversation.lastMessageAt = message.createdAt;
    conversation.updatedAt = message.createdAt;
    this.conversations.set(conversationId, conversation);

    return message;
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
    // ON CONFLICT RETURNING always returns a row; created is approximate for race.
    const wasInsert = inserted.rowCount === 1 && !existing.rows[0];
    return {
      conversation: rowToConversation(inserted.rows[0]),
      created: wasInsert,
    };
  }

  async listMessages(
    conversationId: string,
    limit = 100,
  ): Promise<MessageRecord[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    const result = await this.pool.query(
      `SELECT id, conversation_id, sender_id, body, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [conversationId, capped],
    );
    return result.rows.map(rowToMessage);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
  ): Promise<MessageRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const conv = await client.query(
        `SELECT id, user_a_id, user_b_id FROM conversations WHERE id = $1 FOR UPDATE`,
        [conversationId],
      );
      const row = conv.rows[0];
      if (!row) {
        throw Object.assign(new Error('conversation_not_found'), {
          code: 'conversation_not_found',
        });
      }
      if (row.user_a_id !== senderId && row.user_b_id !== senderId) {
        throw Object.assign(new Error('forbidden'), { code: 'forbidden' });
      }

      const inserted = await client.query(
        `INSERT INTO messages (conversation_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, conversation_id, sender_id, body, created_at`,
        [conversationId, senderId, body],
      );
      const preview = body.slice(0, 140);
      await client.query(
        `UPDATE conversations
         SET last_message_preview = $2,
             last_message_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [conversationId, preview],
      );
      await client.query('COMMIT');
      return rowToMessage(inserted.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
