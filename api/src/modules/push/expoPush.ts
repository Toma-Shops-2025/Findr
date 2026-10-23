const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

/** Send Expo push notifications (FCM/APNs under the hood). */
export async function sendExpoPush(
  tokens: string[],
  payload: PushPayload,
): Promise<void> {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  if (unique.length === 0) return;

  const messages = unique.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    channelId: 'messages',
    priority: 'high',
  }));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    console.warn(
      '[findr-push] EXPO_ACCESS_TOKEN is not set on the API — Expo may reject pushes for this project',
    );
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    console.warn('[findr-push] expo push HTTP failed', res.status, text.slice(0, 400));
    return;
  }

  try {
    const parsed = JSON.parse(text) as {
      data?: Array<{ status?: string; message?: string; details?: unknown }>;
    };
    const tickets = parsed.data ?? [];
    const errors = tickets.filter((t) => t.status === 'error');
    if (errors.length > 0) {
      console.warn(
        '[findr-push] expo push ticket errors',
        JSON.stringify(errors).slice(0, 500),
      );
    } else if (tickets.length > 0) {
      console.info(
        '[findr-push] expo push accepted',
        tickets.length,
        'ticket(s)',
      );
    }
  } catch {
    console.warn('[findr-push] expo push unexpected response', text.slice(0, 200));
  }
}
