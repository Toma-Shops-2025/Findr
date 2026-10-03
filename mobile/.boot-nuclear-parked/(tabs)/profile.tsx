import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.photo}>
        <Text style={styles.initial}>Y</Text>
      </View>
      <Text style={styles.name}>Your profile</Text>
      <Text style={styles.meta}>Age · pronouns · looking for</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.body}>
          Profile create/edit stub. Inclusive fields for gender, orientations
          (multi-select seeking), and looking-for intents land next.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <Text style={styles.body}>
          TODO: signed upload → media scan → CDN. 1–6 photos.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    padding: spacing.lg,
    gap: spacing.md,
  },
  photo: {
    width: 120,
    height: 150,
    borderRadius: radii.lg,
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: typography.brand,
    fontSize: 48,
    color: colors.coral,
  },
  name: {
    fontFamily: typography.heading,
    fontSize: 24,
    color: colors.mist,
  },
  meta: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 14,
  },
  section: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.heading,
    color: colors.teal,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    fontFamily: typography.body,
    color: colors.mist,
    fontSize: 15,
    lineHeight: 22,
  },
});
