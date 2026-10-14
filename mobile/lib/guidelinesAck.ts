import { readPreference, writePreference } from '@/lib/session';

const ACK_VALUE = '1';

function keyForUser(userId: string): string {
  return `findr.guidelinesAck.${userId}`;
}

export async function isGuidelinesAckedLocally(userId: string): Promise<boolean> {
  const v = await readPreference(keyForUser(userId));
  return v === ACK_VALUE;
}

export async function markGuidelinesAckedLocally(userId: string): Promise<void> {
  await writePreference(keyForUser(userId), ACK_VALUE);
}
