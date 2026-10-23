import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { revokeGridIfStored } from '@/lib/gridRevoke';

function postPresence(accessToken: string, active: boolean): void {
  void apiFetch('/auth/presence', {
    method: 'POST',
    token: accessToken,
    body: JSON.stringify({ active }),
  }).catch(() => undefined);
}

/**
 * - Background (recents): clear online dot only; stay on Nearby grid.
 * - Cold start after swipe-away: revoke grid before login (see gridRevoke).
 * - Foreground: mark active again (green dot).
 */
export function FindrPresenceLifecycle() {
  const { accessToken, ready, user } = useAuth();
  const revokedRef = useRef(false);

  useEffect(() => {
    if (!ready || user) return;
    if (revokedRef.current) return;
    revokedRef.current = true;
    void revokeGridIfStored();
  }, [ready, user]);

  useEffect(() => {
    if (!accessToken) return;

    const onChange = (next: AppStateStatus) => {
      if (next === 'active') {
        postPresence(accessToken, true);
      } else if (next === 'background' || next === 'inactive') {
        postPresence(accessToken, false);
      }
    };

    postPresence(accessToken, true);
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [accessToken]);

  return null;
}
