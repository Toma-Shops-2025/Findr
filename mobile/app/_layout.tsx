import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';

export { ErrorBoundary } from 'expo-router';
export const unstable_settings = { initialRouteName: 'index' };

/**
 * SAFE MODE root layout:
 * - gesture-handler + reanimated side-effect imports first (expo-router peers)
 * - hideAsync on mount (never preventAutoHideAsync / useFonts gate)
 * - AuthProvider + Stack only; system fonts via theme tokens
 * - camera/album/chat are file routes (not imported here)
 */
export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
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
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat', presentation: 'card' }} />
        <Stack.Screen name="user/[id]" options={{ title: 'Profile', presentation: 'card' }} />
        <Stack.Screen name="camera" options={{ title: 'Camera', presentation: 'modal' }} />
        <Stack.Screen name="album" options={{ title: 'Album', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}