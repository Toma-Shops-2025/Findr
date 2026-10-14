import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
            <Text style={styles.body}>
              Findr is 18+ only. Be respectful. No minors, threats, hate, or
              non-consensual images. Profile grid photos must not be explicit;
              chat media between adults is your choice — block anyone who crosses
              your boundaries.
            </Text>
            <Text style={styles.body}>
              Report and block are in every profile and chat. We review reports
              and may hide or remove accounts that break these rules.
            </Text>
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
