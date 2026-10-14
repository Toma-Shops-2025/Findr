import type pg from 'pg';

import { getPool } from '../db.js';

class MemoryFavoriteStore {
  private favorites = new Map<string, Set<string>>();

  async add(userId: string, favoriteUserId: string): Promise<void> {
    let set = this.favorites.get(userId);
    if (!set) {
      set = new Set();
      this.favorites.set(userId, set);
    }
    set.add(favoriteUserId);
  }

  async remove(userId: string, favoriteUserId: string): Promise<void> {
    this.favorites.get(userId)?.delete(favoriteUserId);
  }

  async list(userId: string): Promise<string[]> {
    return [...(this.favorites.get(userId) ?? [])];
  }

  async isFavorite(userId: string, favoriteUserId: string): Promise<boolean> {
    return this.favorites.get(userId)?.has(favoriteUserId) ?? false;
  }
}

class PostgresFavoriteStore {
  constructor(private pool: pg.Pool) {}

  async add(userId: string, favoriteUserId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_favorites (user_id, favorite_user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, favoriteUserId],
    );
  }

  async remove(userId: string, favoriteUserId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2`,
      [userId, favoriteUserId],
    );
  }

  async list(userId: string): Promise<string[]> {
    const res = await this.pool.query(
      `SELECT favorite_user_id FROM user_favorites
       WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows.map((r) => String(r.favorite_user_id));
  }

  async isFavorite(userId: string, favoriteUserId: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2 LIMIT 1`,
      [userId, favoriteUserId],
    );
    return (res.rowCount ?? 0) > 0;
  }
}

let storePromise: Promise<MemoryFavoriteStore | PostgresFavoriteStore> | null =
  null;

export async function getFavoriteStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) return new MemoryFavoriteStore();
      return new PostgresFavoriteStore(pool);
    })();
  }
  return storePromise;
}
