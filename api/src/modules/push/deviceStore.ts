import type pg from 'pg';

import { getPool } from '../db.js';

class MemoryDeviceStore {
  private byUser = new Map<string, Set<string>>();

  async upsert(userId: string, expoPushToken: string): Promise<void> {
    this.byUser.set(userId, new Set([expoPushToken]));
  }

  async listTokens(userId: string): Promise<string[]> {
    return [...(this.byUser.get(userId) ?? [])];
  }

  async remove(userId: string, expoPushToken: string): Promise<void> {
    this.byUser.get(userId)?.delete(expoPushToken);
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

  async listTokens(userId: string): Promise<string[]> {
    const res = await this.pool.query(
      `SELECT expo_push_token FROM push_devices WHERE user_id = $1`,
      [userId],
    );
    return res.rows.map((r) => String(r.expo_push_token));
  }

  async remove(userId: string, expoPushToken: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM push_devices WHERE user_id = $1 AND expo_push_token = $2`,
      [userId, expoPushToken],
    );
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
