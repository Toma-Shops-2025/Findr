import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.messages}>
        <View style={[styles.bubble, styles.theirs]}>
          <Text style={styles.bubbleText}>Hey — chat thread stub ({id}).</Text>
        </View>
        <View style={[styles.bubble, styles.mine]}>
          <Text style={[styles.bubbleText, styles.mineText]}>
            TODO: vendor SDK tokens + media pipeline.
          </Text>
        </View>
      </View>
      <View style={styles.composer}>
        <TextInput
          placeholder="Message…"
          placeholderTextColor={colors.mistMuted}
          style={styles.input}
          editable={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  messages: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.coral,
  },
  bubbleText: {
    fontFamily: typography.body,
    color: colors.mist,
    fontSize: 15,
    lineHeight: 20,
  },
  mineText: {
    color: colors.ink,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  input: {
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.mist,
    fontFamily: typography.body,
  },
});
