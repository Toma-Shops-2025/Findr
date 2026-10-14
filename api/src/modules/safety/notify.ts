import type { CreatedReport } from './reportStore.js';
import { notifyFounderInvestigation } from '../notify/founderAlerts.js';

export async function notifySafetyReport(
  report: CreatedReport,
  log: { warn: (obj: unknown, msg?: string) => void; info: (obj: unknown, msg?: string) => void },
): Promise<void> {
  const payload = {
    event: 'safety_report_created',
    reportId: report.id,
    reason: report.reason,
    reporterId: report.reporterId,
    targetUserId: report.targetUserId,
    createdAt: report.createdAt,
  };
  const level = report.reason === 'underage_suspicion' ? 'warn' : 'info';
  log[level](payload, 'Safety report received');

  const adminUrl = process.env.ADMIN_PUBLIC_URL?.trim() || 'https://api.myfindr.fun/admin/';
  await notifyFounderInvestigation({
    kind: 'safety_report',
    title:
      report.reason === 'underage_suspicion'
        ? 'Child safety report'
        : 'New safety report',
    body: `Reason: ${report.reason}\nReport: ${report.id}\nTarget: ${report.targetUserId}\nReporter: ${report.reporterId}\nReview: ${adminUrl}`,
    data: { reportId: report.id, reason: report.reason },
  }).catch((err) => {
    log.warn({ err }, 'founder alert failed');
  });
}
