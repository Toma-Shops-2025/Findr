import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

/**
 * Launch-crash hard fix (EAS 6e8a9c28 / splash → "Findr keeps stopping"):
 * - Do NOT call SplashScreen.preventAutoHideAsync() (held native splash open).
 * - Do NOT gate first paint on useFonts / Google font packages.
 * - Do NOT throw on font errors (that hard-crashes after splash).
 * - Do NOT side-effect import react-native-reanimated here (unused; Reanimated 4
 *   + Worklets init is a known New-Arch launch crash surface).
 * - Always hideAsync on mount; never return null — paint shell on frame 1.
 * - chat/[id], camera, album stay route-local; not imported at root.
 */
export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Already hidden or native module unavailable — ignore.
    });
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.mist,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.ink },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="chat/[id]"
          options={{ title: 'Chat', presentation: 'card' }}
        />
        <Stack.Screen
          name="user/[id]"
          options={{ title: 'Profile', presentation: 'card' }}
        />
        <Stack.Screen name="camera" options={{ title: 'Camera', presentation: 'modal' }} />
        <Stack.Screen name="album" options={{ title: 'Album', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
