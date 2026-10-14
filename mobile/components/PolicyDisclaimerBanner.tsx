import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

/** Shown on Safety and legal screens — policies can change; continued use = acceptance. */
export const POLICY_DISCLAIMER_TEXT =
  'These policies may be updated from time to time. Continued use of Findr means you accept the current version shown here.';

export const SAFETY_DISCLAIMER_TEXT =
  'Findr is 18+ only. Meet people at your own risk — we are not a background-check or emergency service. ' +
  POLICY_DISCLAIMER_TEXT;

type Props = {
  /** Safety tab uses the longer 18+ / meetup reminder. */
  variant?: 'policy' | 'safety';
};

export function PolicyDisclaimerBanner({ variant = 'policy' }: Props) {
  const text = variant === 'safety' ? SAFETY_DISCLAIMER_TEXT : POLICY_DISCLAIMER_TEXT;
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.bannerText}>{text}</Text>
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
