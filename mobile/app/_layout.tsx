import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/constants/theme";
import { AuthProvider } from "@/lib/auth";

export { ErrorBoundary } from "expo-router";
export const unstable_settings = { initialRouteName: "index" };

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.ink }, headerTintColor: colors.mist, headerTitleStyle: { fontWeight: "600" }, contentStyle: { backgroundColor: colors.ink } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="user/[id]" options={{ title: "Profile", presentation: "card" }} />
        <Stack.Screen name="chat/[id]" options={{ title: "Chat", presentation: "card" }} />
        <Stack.Screen name="album" options={{ title: "Album", presentation: "card" }} />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
