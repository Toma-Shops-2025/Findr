const RESEND_API = 'https://api.resend.com/emails';

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ??
    process.env.SAFETY_ALERT_FROM?.trim() ??
    'Findr <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn('[findr-email] RESEND_API_KEY not set; email not sent:', opts.subject);
    return false;
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? undefined,
    }),
  });

  if (!res.ok) {
    console.warn('[findr-email] send failed', res.status, await res.text());
    return false;
  }
  return true;
}
