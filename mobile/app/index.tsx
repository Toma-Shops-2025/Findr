import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { accessToken, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.mist} />
      </View>
    );
  }
  if (!accessToken) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/nearby" />;
}
