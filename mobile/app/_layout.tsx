import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/theme";
import { AuthProvider } from "@/lib/auth";

export { ErrorBoundary } from "expo-router";
export const unstable_settings = { initialRouteName: "index" };

export default function RootLayout() {
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.mist,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: colors.ink },
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ title: "Chat", presentation: "card" }} />
        <Stack.Screen name="user/[id]" options={{ title: "Profile", presentation: "card" }} />
      </Stack>
    </AuthProvider>
  );
}
