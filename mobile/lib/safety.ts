import { Alert } from 'react-native';

import { apiFetch } from '@/lib/api';
import type { ReportReason } from '@/lib/types';

export type SafetyContentType = 'user' | 'message' | 'profile' | 'photo';

/**
 * Confirm + POST /safety/block. Mutual invisibility in nearby + chat.
 * (Two-button Alert is fine on Android.)
 */
export function confirmBlockUser(opts: {
  token: string;
  userId: string;
  displayName?: string;
  onBlocked?: () => void;
}): void {
  const label = opts.displayName?.trim() || 'this person';
  Alert.alert(
    'Block this person?',
    `${label} will disappear from Nearby and chat for both of you. You can unblock later in Settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiFetch('/safety/block', {
                method: 'POST',
                token: opts.token,
                body: JSON.stringify({ userId: opts.userId }),
              });
              Alert.alert('Blocked', `${label} is blocked.`);
              opts.onBlocked?.();
            } catch (err) {
              Alert.alert(
                'Could not block',
                err instanceof Error ? err.message : 'Try again',
              );
            }
          })();
        },
      },
    ],
  );
}

/** POST /safety/report — expects 201. */
export async function submitReport(opts: {
  token: string;
  userId: string;
  reason: ReportReason;
  contentType?: SafetyContentType;
  contentId?: string;
}): Promise<void> {
  await apiFetch('/safety/report', {
    method: 'POST',
    token: opts.token,
    body: JSON.stringify({
      userId: opts.userId,
      reason: opts.reason,
      contentType: opts.contentType ?? 'user',
      contentId: opts.contentId,
    }),
  });
}

export async function unblockUser(
  token: string,
  userId: string,
): Promise<void> {
  await apiFetch('/safety/unblock', {
    method: 'POST',
    token,
    body: JSON.stringify({ userId }),
  });
}
