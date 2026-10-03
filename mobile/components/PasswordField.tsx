import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/constants/theme";
export function PasswordField({ value, onChangeText, style, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <TextInput value={value} onChangeText={onChangeText} placeholderTextColor={colors.mistMuted} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} style={[styles.input, style]} {...rest} />
      <Pressable onPress={() => setVisible((v) => !v)} style={styles.eye} hitSlop={8}>
        <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={colors.mistMuted} />
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { position: "relative", justifyContent: "center" },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inkElevated, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, paddingRight: 48, color: colors.mist, fontFamily: typography.body, fontSize: 16 },
  eye: { position: "absolute", right: spacing.md, height: "100%", justifyContent: "center" },
});