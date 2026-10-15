import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COMMUNITY_GUIDELINES_PARAGRAPHS } from '@/lib/communityGuidelines';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  visible: boolean;
  onAccept: () => void;
};

/**
 * One-time community guidelines ack (similar spirit to Grindr's first-run safety copy).
 */
export function GuidelinesAckModal({ visible, onAccept }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Community guidelines</Text>
            {COMMUNITY_GUIDELINES_PARAGRAPHS.map((paragraph) => (
              <Text key={paragraph.slice(0, 24)} style={styles.body}>
                {paragraph}
              </Text>
            ))}
          </ScrollView>
          <Pressable style={styles.btn} onPress={onAccept}>
            <Text style={styles.btnText}>I agree — continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.inkElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  title: {
    fontFamily: typography.heading,
    fontSize: 20,
    color: colors.mist,
    marginBottom: spacing.md,
  },
  body: {
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.mistMuted,
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnText: {
    fontFamily: typography.bodyMedium,
    fontSize: 16,
    color: colors.ink,
    fontWeight: '700',
  },
});
