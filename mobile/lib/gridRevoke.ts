import { apiFetch } from '@/lib/api';
import { deletePreference, readPreference, writePreference } from '@/lib/session';

const GRID_REVOKE_KEY = 'findr.gridRevoke';

export type GridRevokePayload = {
  userId: string;
  gridRevokeSecret: string;
};

export async function saveGridRevokeSecret(
  userId: string,
  gridRevokeSecret: string,
): Promise<void> {
  const payload: GridRevokePayload = { userId, gridRevokeSecret };
  await writePreference(GRID_REVOKE_KEY, JSON.stringify(payload));
}

export async function clearGridRevokeSecret(): Promise<void> {
  await deletePreference(GRID_REVOKE_KEY);
}

/** After swipe-away kill: remove coarse location from Nearby before next login. */
export async function revokeGridIfStored(): Promise<void> {
  const raw = await readPreference(GRID_REVOKE_KEY);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw) as GridRevokePayload;
    if (!payload.userId || !payload.gridRevokeSecret) return;
    await apiFetch('/geo/revoke-grid', {
      method: 'POST',
      body: JSON.stringify({
        userId: payload.userId,
        gridRevokeSecret: payload.gridRevokeSecret,
      }),
    });
  } catch {
    // Best-effort; stale secret is harmless.
  } finally {
    await clearGridRevokeSecret();
  }
}
