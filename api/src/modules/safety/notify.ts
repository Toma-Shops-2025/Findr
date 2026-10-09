import type { CreatedReport } from './reportStore.js';

const RESEND_API = 'https://api.resend.com/emails';

function isChildSafetyReason(reason: string): boolean {
  return reason === 'underage_suspicion';
}

/**
 * Email ops on child-safety reports when Resend is configured.
 * Always logs a structured line for Render log drains / manual review.
 */
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
    contentType: report.evidence.contentType,
    contentId: report.evidence.contentId,
    createdAt: report.createdAt,
  };

  if (isChildSafetyReason(report.reason)) {
    log.warn(payload, 'Child safety report received');
  } else {
    log.info(payload, 'Safety report received');
  }

  if (!isChildSafetyReason(report.reason)) {
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.SAFETY_ALERT_TO?.trim() ?? 'contactus@myfindr.fun';
  const from =
    process.env.SAFETY_ALERT_FROM?.trim() ?? 'Findr Safety <onboarding@resend.dev>';

  if (!apiKey) {
    log.warn(
      { reportId: report.id },
      'RESEND_API_KEY not set; child safety email not sent (report is persisted)',
    );
    return;
  }

  const subject = `[Findr] Child safety report ${report.id.slice(0, 8)}`;
  const text = [
    'Findr child safety report (underage suspicion)',
    '',
    `Report ID: ${report.id}`,
    `Created: ${report.createdAt}`,
    `Reason: ${report.reason}`,
    `Reporter user ID: ${report.reporterId}`,
    `Reported user ID: ${report.targetUserId}`,
    report.evidence.contentType
      ? `Content: ${report.evidence.contentType} ${report.evidence.contentId ?? ''}`
      : '',
    report.details ? `Details: ${report.details}` : '',
    '',
    'Review in Postgres reports table (status=open) or your admin process.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      log.warn(
        { reportId: report.id, status: res.status, body },
        'Failed to send child safety alert email',
      );
    }
  } catch (err) {
    log.warn({ reportId: report.id, err }, 'Child safety alert email error');
  }
}
