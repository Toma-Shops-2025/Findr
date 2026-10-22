import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiFetch } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushRegisterResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Register Expo push token with API (Android production + iOS). */
export async function registerFindrPushToken(
  accessToken: string,
): Promise<PushRegisterResult> {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'Push is not available on web.' };
  }

  try {
    // Android 13+: channel must exist before the OS permission prompt / token.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 120, 80, 120],
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      finalStatus = asked.status;
    }
    if (finalStatus !== 'granted') {
      return {
        ok: false,
        reason:
          'Notifications are off for Findr. Turn them on in Android Settings.',
      };
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      return {
        ok: false,
        reason: 'Missing Expo projectId in this build (EAS config).',
      };
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: String(projectId),
    });
    const expoPushToken = token.data?.trim();
    if (!expoPushToken) {
      return { ok: false, reason: 'Could not get a push token from Expo.' };
    }

    await apiFetch('/devices/push-token', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        expoPushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }),
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Findr push registration failed', msg);
    if (/firebase|FCM|google-services/i.test(msg)) {
      return {
        ok: false,
        reason:
          'This Android build needs Firebase (FCM) set up in Expo — see docs/findr-push-android-fcm.md.',
      };
    }
    return { ok: false, reason: msg || 'Push registration failed.' };
  }
}
