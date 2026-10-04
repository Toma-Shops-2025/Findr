import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/constants/theme';

type Section = {
  heading: string;
  body: string;
};

type Props = {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
};

/**
 * Shared layout for in-app legal / FAQ template pages.
 * Copy is an MVP template - not legal advice. Have counsel review before store launch.
 */
export function LegalDocScreen({ title, updated, intro, sections }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>Last updated: {updated}</Text>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            TEMPLATE for Findr MVP UX. This is not legal advice and has not been
            reviewed by a lawyer. Toma should have qualified counsel review and
            customize this before Play Store / public launch.
          </Text>
        </View>
        <Text style={styles.body}>{intro}</Text>
        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.heading,
    fontSize: 24,
    color: colors.mist,
  },
  meta: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.mistMuted,
  },
  banner: {
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  bannerText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.coral,
    lineHeight: 18,
  },
  heading: {
    fontFamily: typography.heading,
    fontSize: 16,
    color: colors.teal,
    marginBottom: spacing.xs,
  },
  body: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.mist,
    lineHeight: 22,
  },
  section: {
    gap: spacing.xs,
  },
});