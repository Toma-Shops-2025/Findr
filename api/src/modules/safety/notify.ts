import { sendTransactionalEmail } from '../email/send.js';
import type { CreatedReport } from './reportStore.js';

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
  if (report.reason === 'underage_suspicion') {
    log.warn(payload, 'Child safety report received');
    const to = process.env.SAFETY_ALERT_TO?.trim() ?? 'contactus@myfindr.fun';
    await sendTransactionalEmail({
      to,
      subject: `[Findr] Child safety report ${report.id.slice(0, 8)}`,
      text: `Underage suspicion report.\nID: ${report.id}\nTarget user: ${report.targetUserId}\nReporter: ${report.reporterId}`,
    });
  } else {
    log.info(payload, 'Safety report received');
  }
}
