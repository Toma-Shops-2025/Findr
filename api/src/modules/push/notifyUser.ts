import { getDeviceStore } from './deviceStore.js';
import { sendExpoPush } from './expoPush.js';

export async function notifyUserPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const devices = await getDeviceStore();
  const tokens = await devices.listTokens(userId);
  if (tokens.length === 0) {
    console.warn('[findr-push] no expo push tokens for user', userId);
    return;
  }
  console.info(
    '[findr-push] sending',
    tokens.length,
    'token(s) to user',
    userId,
    title,
  );
  await sendExpoPush(tokens, {
    title,
    body,
    ...(data ? { data } : {}),
  });
}
