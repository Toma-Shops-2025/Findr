import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  /** Short label for screen readers. */
  context?: string;
};

/**
 * Reserved band for future ad SDK (no ad network wired yet).
 */
export function AdPlaceholderBand({ context = 'Findr' }: Props) {
  return (
    <View
      style={styles.band}
      accessibilityRole="text"
      accessibilityLabel={`Reserved ad space on ${context}`}
    >
      <Text style={styles.label}>Sponsored</Text>
      <Text style={styles.hint}>Ad space reserved for when traffic grows</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.inkElevated,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: colors.mistMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hint: {
    fontFamily: typography.body,
    fontSize: 11,
    color: colors.mistMuted,
    textAlign: 'center',
  },
});
