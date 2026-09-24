import type pg from 'pg';

import { getPool } from '../db.js';
import type { LookingFor, ProfileRecord, ProfileUpdateInput } from './types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function asLookingFor(values: unknown): LookingFor[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set([
    'dates',
    'friends',
    'casual',
    'relationship',
    'networking',
  ]);
  return values.filter((v): v is LookingFor => typeof v === 'string' && allowed.has(v));
}

function asStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function rowToProfile(row: Record<string, unknown>): ProfileRecord {
  return {
    userId: String(row.user_id),
    displayName: String(row.display_name ?? ''),
    bio: String(row.bio ?? ''),
    genderIdentity: String(row.gender_identity ?? ''),
    orientationsShown: asStringArray(row.orientations_shown),
    orientationsSeeking: asStringArray(row.orientations_seeking),
    lookingFor: asLookingFor(row.looking_for),
    photoUrls: asStringArray(row.photo_urls),
    isVisible: Boolean(row.is_visible ?? true),
    lastActiveAt:
      row.last_active_at instanceof Date
        ? row.last_active_at.toISOString()
        : row.last_active_at
          ? String(row.last_active_at)
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

class MemoryProfileStore {
  private byUserId = new Map<string, ProfileRecord>();

  async get(userId: string): Promise<ProfileRecord | null> {
    return this.byUserId.get(userId) ?? null;
  }

  async upsert(userId: string, input: ProfileUpdateInput): Promise<ProfileRecord> {
    const existing = this.byUserId.get(userId);
    const stamp = nowIso();
    const next: ProfileRecord = {
      userId,
      displayName: input.displayName.trim(),
      bio: (input.bio ?? existing?.bio ?? '').trim(),
      genderIdentity: (input.genderIdentity ?? existing?.genderIdentity ?? '').trim(),
      orientationsShown:
        input.orientationsShown ?? existing?.orientationsShown ?? [],
      orientationsSeeking:
        input.orientationsSeeking ?? existing?.orientationsSeeking ?? [],
      lookingFor: input.lookingFor ?? existing?.lookingFor ?? [],
      photoUrls: input.photoUrls ?? existing?.photoUrls ?? [],
      isVisible: input.isVisible ?? existing?.isVisible ?? true,
      lastActiveAt: stamp,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    };
    this.byUserId.set(userId, next);
    return next;
  }

  async listVisibleExcept(excludeUserId: string): Promise<ProfileRecord[]> {
    return [...this.byUserId.values()].filter(
      (p) => p.userId !== excludeUserId && p.isVisible,
    );
  }

  async touchActive(userId: string): Promise<void> {
    const existing = this.byUserId.get(userId);
    if (!existing) return;
    existing.lastActiveAt = nowIso();
    existing.updatedAt = existing.lastActiveAt;
  }
}

class PostgresProfileStore {
  constructor(private pool: pg.Pool) {}

  async get(userId: string): Promise<ProfileRecord | null> {
    const result = await this.pool.query(
      `SELECT user_id, display_name, bio, gender_identity,
              orientations_shown, orientations_seeking, looking_for,
              photo_urls, is_visible, last_active_at, created_at, updated_at
       FROM profiles
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? rowToProfile(row) : null;
  }

  async upsert(userId: string, input: ProfileUpdateInput): Promise<ProfileRecord> {
    const result = await this.pool.query(
      `INSERT INTO profiles (
         user_id, display_name, bio, gender_identity,
         orientations_shown, orientations_seeking, looking_for,
         photo_urls, is_visible, last_active_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
       )
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         bio = EXCLUDED.bio,
         gender_identity = EXCLUDED.gender_identity,
         orientations_shown = EXCLUDED.orientations_shown,
         orientations_seeking = EXCLUDED.orientations_seeking,
         looking_for = EXCLUDED.looking_for,
         photo_urls = EXCLUDED.photo_urls,
         is_visible = EXCLUDED.is_visible,
         last_active_at = now(),
         updated_at = now()
       RETURNING user_id, display_name, bio, gender_identity,
                 orientations_shown, orientations_seeking, looking_for,
                 photo_urls, is_visible, last_active_at, created_at, updated_at`,
      [
        userId,
        input.displayName.trim(),
        (input.bio ?? '').trim() || null,
        (input.genderIdentity ?? '').trim() || null,
        input.orientationsShown ?? [],
        input.orientationsSeeking ?? [],
        input.lookingFor ?? [],
        input.photoUrls ?? [],
        input.isVisible ?? true,
      ],
    );
    return rowToProfile(result.rows[0]);
  }

  async listVisibleExcept(excludeUserId: string): Promise<ProfileRecord[]> {
    const result = await this.pool.query(
      `SELECT user_id, display_name, bio, gender_identity,
              orientations_shown, orientations_seeking, looking_for,
              photo_urls, is_visible, last_active_at, created_at, updated_at
       FROM profiles
       WHERE is_visible = TRUE AND user_id <> $1`,
      [excludeUserId],
    );
    return result.rows.map(rowToProfile);
  }

  async touchActive(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE profiles SET last_active_at = now(), updated_at = now()
       WHERE user_id = $1`,
      [userId],
    );
  }
}

export type ProfileStore = MemoryProfileStore | PostgresProfileStore;

let storePromise: Promise<ProfileStore> | null = null;

export async function getProfileStore(): Promise<ProfileStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) return new MemoryProfileStore();
      return new PostgresProfileStore(pool);
    })();
  }
  return storePromise;
}
