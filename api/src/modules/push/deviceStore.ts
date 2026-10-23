import type pg from 'pg';

import { getPool } from '../db.js';

/** Only deliver chat push if the app process was alive recently (recents OK, swipe-away stops). */
export const PUSH_DELIVERY_MAX_AGE_SEC = 120;

class MemoryDeviceStore {
  private byUser = new Map<string, Set<string>>();
  private lastAliveMs = new Map<string, number>();

  async upsert(userId: string, expoPushToken: string): Promise<void> {
    this.byUser.set(userId, new Set([expoPushToken]));
    this.lastAliveMs.set(userId, Date.now());
  }

  async touchAlive(userId: string): Promise<void> {
    if (this.byUser.has(userId)) {
      this.lastAliveMs.set(userId, Date.now());
    }
  }

  async listTokens(userId: string): Promise<string[]> {
    return [...(this.byUser.get(userId) ?? [])];
  }

  async listDeliverableTokens(userId: string): Promise<string[]> {
    const tokens = await this.listTokens(userId);
    if (tokens.length === 0) return [];
    const last = this.lastAliveMs.get(userId) ?? 0;
    if (Date.now() - last > PUSH_DELIVERY_MAX_AGE_SEC * 1000) return [];
    return tokens;
  }

  async remove(userId: string, expoPushToken: string): Promise<void> {
    this.byUser.get(userId)?.delete(expoPushToken);
  }

  async removeAllForUser(userId: string): Promise<void> {
    this.byUser.delete(userId);
    this.lastAliveMs.delete(userId);
  }
}

class PostgresDeviceStore {
  constructor(private pool: pg.Pool) {}

  async upsert(userId: string, expoPushToken: string, platform = 'android'): Promise<void> {
    await this.pool.query(
      `INSERT INTO push_devices (user_id, expo_push_token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, expo_push_token)
       DO UPDATE SET updated_at = NOW(), platform = EXCLUDED.platform`,
      [userId, expoPushToken, platform],
    );
    // One active device token per user (reinstalls were stacking stale Expo tokens).
    await this.pool.query(
      `DELETE FROM push_devices
       WHERE user_id = $1 AND expo_push_token <> $2`,
      [userId, expoPushToken],
    );
  }

  async touchAlive(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE push_devices SET updated_at = NOW() WHERE user_id = $1`,
      [userId],
    );
  }

  async listTokens(userId: string): Promise<string[]> {
    const res = await this.pool.query(
      `SELECT expo_push_token FROM push_devices WHERE user_id = $1`,
      [userId],
    );
    return res.rows.map((r) => String(r.expo_push_token));
  }

  async listDeliverableTokens(userId: string): Promise<string[]> {
    const res = await this.pool.query(
      `SELECT expo_push_token FROM push_devices
       WHERE user_id = $1
         AND updated_at >= NOW() - ($2::int * interval '1 second')`,
      [userId, PUSH_DELIVERY_MAX_AGE_SEC],
    );
    return res.rows.map((r) => String(r.expo_push_token));
  }

  async remove(userId: string, expoPushToken: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM push_devices WHERE user_id = $1 AND expo_push_token = $2`,
      [userId, expoPushToken],
    );
  }

  async removeAllForUser(userId: string): Promise<void> {
    await this.pool.query(`DELETE FROM push_devices WHERE user_id = $1`, [
      userId,
    ]);
  }
}

let storePromise: Promise<MemoryDeviceStore | PostgresDeviceStore> | null = null;

export async function getDeviceStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) return new MemoryDeviceStore();
      return new PostgresDeviceStore(pool);
    })();
  }
  return storePromise;
}
