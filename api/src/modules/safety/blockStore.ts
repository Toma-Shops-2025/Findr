import type pg from 'pg';

import { getPool } from '../db.js';

export type BlockEdge = {
  blockedUserId: string;
  createdAt: string;
};

/**
 * Mutual invisibility set for the current user (blocker or blocked).
 * Nearby + chat both filter via blockedPairIds.
 */
class MemoryBlockStore {
  /** blockerId -> set of blockedIds */
  private edges = new Map<string, Set<string>>();
  /** blockerId|blockedId -> createdAt */
  private createdAt = new Map<string, string>();

  private key(blockerId: string, blockedId: string): string {
    return `${blockerId}|${blockedId}`;
  }

  async blockedPairIds(userId: string): Promise<Set<string>> {
    const out = new Set<string>();
    for (const [blocker, blocked] of this.edges) {
      if (blocker === userId) {
        for (const id of blocked) out.add(id);
      } else if (blocked.has(userId)) {
        out.add(blocker);
      }
    }
    return out;
  }

  async addBlock(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) return;
    const set = this.edges.get(blockerId) ?? new Set();
    set.add(blockedId);
    this.edges.set(blockerId, set);
    const k = this.key(blockerId, blockedId);
    if (!this.createdAt.has(k)) {
      this.createdAt.set(k, new Date().toISOString());
    }
  }

  async removeBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const set = this.edges.get(blockerId);
    if (!set || !set.has(blockedId)) return false;
    set.delete(blockedId);
    if (set.size === 0) this.edges.delete(blockerId);
    this.createdAt.delete(this.key(blockerId, blockedId));
    return true;
  }

  /** Blocks created by this user only (not mutual reverse edges). */
  async listBlocks(blockerId: string): Promise<BlockEdge[]> {
    const set = this.edges.get(blockerId);
    if (!set) return [];
    const out: BlockEdge[] = [];
    for (const blockedUserId of set) {
      out.push({
        blockedUserId,
        createdAt:
          this.createdAt.get(this.key(blockerId, blockedUserId)) ??
          new Date().toISOString(),
      });
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
    return this.edges.get(blockerId)?.has(blockedId) ?? false;
  }
}

class PostgresBlockStore {
  constructor(private pool: pg.Pool) {}

  async blockedPairIds(userId: string): Promise<Set<string>> {
    const result = await this.pool.query(
      `SELECT blocker_id, blocked_id
       FROM blocks
       WHERE blocker_id = $1 OR blocked_id = $1`,
      [userId],
    );
    const out = new Set<string>();
    for (const row of result.rows) {
      if (row.blocker_id === userId) out.add(row.blocked_id);
      else out.add(row.blocker_id);
    }
    return out;
  }

  async addBlock(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) return;
    await this.pool.query(
      `INSERT INTO blocks (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [blockerId, blockedId],
    );
  }

  async removeBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM blocks
       WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listBlocks(blockerId: string): Promise<BlockEdge[]> {
    const result = await this.pool.query(
      `SELECT blocked_id, created_at
       FROM blocks
       WHERE blocker_id = $1
       ORDER BY created_at DESC`,
      [blockerId],
    );
    return result.rows.map((row) => ({
      blockedUserId: String(row.blocked_id),
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    }));
  }

  async isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
      [blockerId, blockedId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export type BlockStore = MemoryBlockStore | PostgresBlockStore;

let storePromise: Promise<BlockStore> | null = null;

export async function getBlockStore(): Promise<BlockStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) return new MemoryBlockStore();
      return new PostgresBlockStore(pool);
    })();
  }
  return storePromise;
}
