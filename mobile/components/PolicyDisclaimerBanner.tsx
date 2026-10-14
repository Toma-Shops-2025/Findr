import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

/**
 * Single source of truth — Safety tab and every in-app legal page show this verbatim.
 */
export const FINDR_POLICY_DISCLAIMER =
  'Findr is 18+ only. Meet people at your own risk - we are not a background-check or emergency service. These policies may be updated from time to time. Continued use of Findr means you accept the current version shown here.';

/** @deprecated Use FINDR_POLICY_DISCLAIMER */
export const POLICY_DISCLAIMER_TEXT = FINDR_POLICY_DISCLAIMER;

/** @deprecated Use FINDR_POLICY_DISCLAIMER */
export const SAFETY_DISCLAIMER_TEXT = FINDR_POLICY_DISCLAIMER;

export function PolicyDisclaimerBanner() {
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.bannerText}>{FINDR_POLICY_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.coral,
    lineHeight: 18,
  },
});
