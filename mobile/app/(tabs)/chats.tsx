import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";
export default function ChatsScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Chats</Text>
      <Text style={s.body}>Coming soon in Stage 2 (media chat parked).</Text>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.mist, fontSize: 22, fontFamily: typography.heading },
  body: { color: colors.mistMuted, fontSize: 14, fontFamily: typography.body },
});