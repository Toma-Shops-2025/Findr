import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const POLL_MS = 12_000;

/** Polls unread chat count for tab badge. */
export function useChatUnreadCount(): number {
  const { accessToken } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setCount(0);
      return;
    }
    try {
      const data = await apiFetch<{ count: number }>('/chat/unread-count', {
        token: accessToken,
      });
      setCount(Math.max(0, data.count ?? 0));
    } catch {
      // Keep last count on transient errors.
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
    if (!accessToken) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [accessToken, refresh]);

  return count;
}

export async function markConversationRead(
  accessToken: string,
  conversationId: string,
): Promise<void> {
  await apiFetch(`/chat/conversations/${conversationId}/read`, {
    method: 'POST',
    token: accessToken,
  });
}
