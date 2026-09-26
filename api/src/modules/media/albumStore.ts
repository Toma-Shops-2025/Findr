import { randomUUID } from 'node:crypto';
import type pg from 'pg';

import { getPool } from '../db.js';
import type { MediaType, UploadKind } from './storage.js';

export type AlbumSource = 'upload' | 'chat' | 'camera' | 'profile' | 'album';

export type UserMediaRecord = {
  id: string;
  userId: string;
  mediaType: MediaType;
  url: string;
  mime: string | null;
  bytes: number | null;
  durationMs: number | null;
  source: AlbumSource;
  createdAt: string;
};

export type AddUserMediaInput = {
  userId: string;
  mediaType: MediaType;
  url: string;
  mime?: string | null;
  bytes?: number | null;
  durationMs?: number | null;
  source?: AlbumSource;
};

function nowIso(): string {
  return new Date().toISOString();
}

function rowToMedia(row: Record<string, unknown>): UserMediaRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    mediaType: row.media_type === 'video' ? 'video' : 'photo',
    url: String(row.url),
    mime: row.mime == null ? null : String(row.mime),
    bytes:
      row.bytes == null || row.bytes === ''
        ? null
        : Number(row.bytes),
    durationMs:
      row.duration_ms == null || row.duration_ms === ''
        ? null
        : Number(row.duration_ms),
    source: String(row.source ?? 'upload') as AlbumSource,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? nowIso()),
  };
}

function sourceFromKind(kind: UploadKind, explicit?: AlbumSource): AlbumSource {
  if (explicit) return explicit;
  if (kind === 'profile') return 'profile';
  if (kind === 'album') return 'album';
  return 'chat';
}

class MemoryAlbumStore {
  private byId = new Map<string, UserMediaRecord>();

  async listForUser(userId: string, limit = 100): Promise<UserMediaRecord[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    return [...this.byId.values()]
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, capped);
  }

  async add(input: AddUserMediaInput): Promise<UserMediaRecord> {
    const record: UserMediaRecord = {
      id: randomUUID(),
      userId: input.userId,
      mediaType: input.mediaType,
      url: input.url,
      mime: input.mime ?? null,
      bytes: input.bytes ?? null,
      durationMs: input.durationMs ?? null,
      source: input.source ?? 'upload',
      createdAt: nowIso(),
    };
    this.byId.set(record.id, record);
    return record;
  }

  async deleteForUser(userId: string, id: string): Promise<boolean> {
    const existing = this.byId.get(id);
    if (!existing || existing.userId !== userId) return false;
    this.byId.delete(id);
    return true;
  }
}

class PostgresAlbumStore {
  constructor(private pool: pg.Pool) {}

  async listForUser(userId: string, limit = 100): Promise<UserMediaRecord[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    const result = await this.pool.query(
      `SELECT id, user_id, media_type, url, mime, bytes, duration_ms, source, created_at
       FROM user_media
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, capped],
    );
    return result.rows.map(rowToMedia);
  }

  async add(input: AddUserMediaInput): Promise<UserMediaRecord> {
    const result = await this.pool.query(
      `INSERT INTO user_media (user_id, media_type, url, mime, bytes, duration_ms, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, media_type, url, mime, bytes, duration_ms, source, created_at`,
      [
        input.userId,
        input.mediaType,
        input.url,
        input.mime ?? null,
        input.bytes ?? null,
        input.durationMs ?? null,
        input.source ?? 'upload',
      ],
    );
    return rowToMedia(result.rows[0]);
  }

  async deleteForUser(userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM user_media WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export type AlbumStore = MemoryAlbumStore | PostgresAlbumStore;

let storePromise: Promise<AlbumStore> | null = null;

export async function getAlbumStore(): Promise<AlbumStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) {
        console.warn(
          '[findr-api] album store: in-memory (set DATABASE_URL + apply 005_media_album.sql)',
        );
        return new MemoryAlbumStore();
      }
      return new PostgresAlbumStore(pool);
    })();
  }
  return storePromise;
}

export { sourceFromKind };
