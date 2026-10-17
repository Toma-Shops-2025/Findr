import type pg from 'pg';

import { getPool } from '../db.js';

export type SafetyNotice = {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

class MemorySafetyNoticeStore {
  private rows: SafetyNotice[] = [];

  async create(userId: string, message: string, kind = 'report_update'): Promise<SafetyNotice> {
    const row: SafetyNotice = {
      id: crypto.randomUUID(),
      kind,
      message,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    this.rows.push(row);
    return row;
  }

  async listUnread(userId: string, limit = 20): Promise<SafetyNotice[]> {
    return this.rows
      .filter((r) => !r.readAt)
      .slice(0, limit);
  }

  async markAllRead(userId: string): Promise<void> {
    const stamp = new Date().toISOString();
    for (const r of this.rows) {
      if (!r.readAt) r.readAt = stamp;
    }
  }
}

class PostgresSafetyNoticeStore {
  constructor(private pool: pg.Pool) {}

  async create(userId: string, message: string, kind = 'report_update'): Promise<SafetyNotice> {
    const result = await this.pool.query(
      `INSERT INTO safety_notices (user_id, kind, message)
       VALUES ($1, $2, $3)
       RETURNING id, kind, message, created_at, read_at`,
      [userId, kind, message],
    );
    const row = result.rows[0];
    return {
      id: String(row.id),
      kind: String(row.kind),
      message: String(row.message),
      createdAt: new Date(row.created_at).toISOString(),
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    };
  }

  async listUnread(userId: string, limit = 20): Promise<SafetyNotice[]> {
    const result = await this.pool.query(
      `SELECT id, kind, message, created_at, read_at
       FROM safety_notices
       WHERE user_id = $1 AND read_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      kind: String(row.kind),
      message: String(row.message),
      createdAt: new Date(row.created_at).toISOString(),
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    }));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE safety_notices SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
  }
}

let storePromise: Promise<MemorySafetyNoticeStore | PostgresSafetyNoticeStore> | null =
  null;

export async function getSafetyNoticeStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) return new MemorySafetyNoticeStore();
      return new PostgresSafetyNoticeStore(pool);
    })();
  }
  return storePromise;
}
