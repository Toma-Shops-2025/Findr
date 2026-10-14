import { getPool } from '../db.js';
import { getProfileStore } from '../profiles/profileStore.js';

const AUTO_HIDE_OPEN_REPORTS = Number(
  process.env.SAFETY_AUTO_HIDE_OPEN_REPORTS ?? '3',
);

/**
 * After a new report: bump target's open report count; optionally hide profile
 * from Nearby (is_visible = false) when threshold is reached.
 */
export async function applyReportSideEffects(targetUserId: string): Promise<void> {
  const pool = await getPool();
  if (!pool || AUTO_HIDE_OPEN_REPORTS <= 0) return;

  const countRes = await pool.query(
    `SELECT COUNT(DISTINCT reporter_id)::int AS c
     FROM reports
     WHERE target_user_id = $1 AND status = 'open'`,
    [targetUserId],
  );
  const openCount = Number(countRes.rows[0]?.c ?? 0);

  await pool.query(
    `UPDATE profiles SET open_safety_reports_count = $2, updated_at = NOW()
     WHERE user_id = $1`,
    [targetUserId, openCount],
  );

  if (openCount >= AUTO_HIDE_OPEN_REPORTS) {
    const profiles = await getProfileStore();
    await profiles.upsert(targetUserId, { isVisible: false });
  }
}
