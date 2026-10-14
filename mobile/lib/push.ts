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

/** Register FCM token with API after login (Android production builds). */
export async function registerFindrPushToken(
  accessToken: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    finalStatus = asked.status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 120, 80, 120],
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  const expoPushToken = token.data;
  if (!expoPushToken) return;

  await apiFetch('/devices/push-token', {
    method: 'POST',
    token: accessToken,
    body: JSON.stringify({
      expoPushToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    }),
  });
}
