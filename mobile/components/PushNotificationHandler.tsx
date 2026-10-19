import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';

function openChatFromNotificationData(
  data: Record<string, unknown> | undefined,
): void {
  if (!data) return;
  const conversationId = data.conversationId;
  if (typeof conversationId === 'string' && conversationId.length > 0) {
    router.push(`/chat/${conversationId}`);
    return;
  }
  const url = data.url;
  if (typeof url === 'string' && url.includes('/chat/')) {
    const match = url.match(/chat\/([a-f0-9-]+)/i);
    if (match?.[1]) router.push(`/chat/${match[1]}`);
  }
}

/**
 * Tap push notification → open the chat thread (cold start + background).
 */
export function PushNotificationHandler() {
  const { accessToken, ready } = useAuth();

  useEffect(() => {
    if (!ready || !accessToken) return;

    const handle = (response: Notifications.NotificationResponse) => {
      openChatFromNotificationData(
        response.notification.request.content.data as Record<string, unknown>,
      );
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handle);

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) handle(last);
    });

    return () => sub.remove();
  }, [ready, accessToken]);

  return null;
}
