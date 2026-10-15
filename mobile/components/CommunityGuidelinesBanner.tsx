import { StyleSheet, Text, View } from 'react-native';

import { COMMUNITY_GUIDELINES_BODY } from '@/lib/communityGuidelines';
import { colors, radii, spacing, typography } from '@/constants/theme';

export function CommunityGuidelinesBanner() {
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.title}>Community guidelines</Text>
      <Text style={styles.bannerText}>{COMMUNITY_GUIDELINES_BODY}</Text>
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
  title: {
    fontFamily: typography.heading,
    fontSize: 15,
    color: colors.mist,
    marginBottom: spacing.sm,
  },
  bannerText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.coral,
    lineHeight: 18,
  },
});
