import { sendTransactionalEmail } from '../email/send.js';
import { sendExpoPush } from '../push/expoPush.js';

function founderEmail(): string {
  return (
    process.env.SAFETY_ALERT_TO?.trim() ||
    process.env.FOUNDER_ALERT_EMAIL?.trim() ||
    'contactus@myfindr.fun'
  );
}

function founderPushTokens(): string[] {
  const raw = process.env.FOUNDER_EXPO_PUSH_TOKEN?.trim();
  if (!raw) return [];
  return raw.split(/[\s,]+/).filter(Boolean);
}

export type FounderAlert = {
  kind: 'safety_report' | 'profile_auto_hidden' | 'admin_attention';
  title: string;
  body: string;
  data?: Record<string, string>;
};

/** Email + optional Expo push when something needs human review. */
export async function notifyFounderInvestigation(
  alert: FounderAlert,
): Promise<void> {
  const text = `${alert.title}\n\n${alert.body}`;
  await sendTransactionalEmail({
    to: founderEmail(),
    subject: `[Findr] ${alert.title}`,
    text,
  });

  const tokens = founderPushTokens();
  if (tokens.length > 0) {
    await sendExpoPush(tokens, {
      title: alert.title,
      body: alert.body.slice(0, 180),
      data: { kind: alert.kind, ...(alert.data ?? {}) },
    });
  }
}
