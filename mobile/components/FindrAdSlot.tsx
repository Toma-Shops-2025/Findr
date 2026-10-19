import { StyleSheet, Text, View } from 'react-native';

import { ADS_ENABLED, adsReadyForSdk } from '@/lib/adsConfig';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Placement = 'chat' | 'nearby';

type Props = {
  placement: Placement;
  context?: string;
};

/**
 * Reserved ad real estate. When EXPO_PUBLIC_ADS_ENABLED=true and unit IDs are set,
 * swap the inner view for react-native-google-mobile-ads BannerAd (not bundled yet).
 */
export function FindrAdSlot({ placement, context = 'Findr' }: Props) {
  if (adsReadyForSdk()) {
    return (
      <View style={styles.band} accessibilityRole="text">
        <Text style={styles.label}>Sponsored</Text>
        <Text style={styles.hint}>
          Ad SDK ready ({placement}) — wire BannerAd in a future build
        </Text>
      </View>
    );
  }

  if (!ADS_ENABLED) {
    return null;
  }

  return (
    <View
      style={styles.band}
      accessibilityRole="text"
      accessibilityLabel={`Ad space on ${context}`}
    >
      <Text style={styles.label}>Sponsored</Text>
      <Text style={styles.hint}>Set AdMob unit IDs in EAS env to show ads</Text>
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
