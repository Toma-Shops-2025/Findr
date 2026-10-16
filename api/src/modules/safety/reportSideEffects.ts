import { getPool } from '../db.js';
import { notifyFounderInvestigation } from '../notify/founderAlerts.js';
import { notifyUserPush } from '../push/notifyUser.js';
import { getProfileStore } from '../profiles/profileStore.js';
import { getSafetyNoticeStore } from './safetyNoticeStore.js';

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

    const reportersRes = await pool.query(
      `SELECT DISTINCT reporter_id
       FROM reports
       WHERE target_user_id = $1 AND status = 'open'`,
      [targetUserId],
    );
    const reporterIds = reportersRes.rows.map((r) => String(r.reporter_id));

    await pool.query(
      `UPDATE reports SET status = 'actioned', resolved_at = NOW()
       WHERE target_user_id = $1 AND status = 'open'`,
      [targetUserId],
    );

    const noticeText =
      'Thanks for your report. We reviewed it and limited this account on Findr. Your safety matters to us.';
    const notices = await getSafetyNoticeStore();
    for (const reporterId of reporterIds) {
      await notices.create(reporterId, noticeText, 'report_closure').catch(() => undefined);
      void notifyUserPush(reporterId, 'Findr', 'Update on your report', {
        kind: 'report_closure',
      }).catch(() => undefined);
    }

    await notifyFounderInvestigation({
      kind: 'profile_auto_hidden',
      title: 'Profile auto-hidden',
      body: `User ${targetUserId} hidden from Nearby after ${openCount} open reports. Review in admin.`,
      data: { targetUserId, openCount: String(openCount) },
    }).catch(() => undefined);
  }
}
