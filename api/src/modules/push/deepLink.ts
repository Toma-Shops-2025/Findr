/** Payload fields the mobile app reads for notification deep links (Expo Router). */
export function chatNotificationData(
  conversationId: string,
  type: 'message' | 'hello' = 'message',
): Record<string, string> {
  return {
    type,
    conversationId,
    url: `findr://chat/${conversationId}`,
  };
}
