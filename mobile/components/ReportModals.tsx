import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { REPORT_REASONS, type ReportReason } from '@/lib/types';

type Props = {
  visible: boolean;
  displayName?: string;
  onCancel: () => void;
  onSelect: (reason: ReportReason, label: string) => void;
};

/** Full-screen reason picker — Alert is limited to 3 buttons on Android. */
export function ReportReasonModal({
  visible,
  displayName,
  onCancel,
  onSelect,
}: Props) {
  const label = displayName?.trim() || 'this person';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Report</Text>
          <Text style={styles.sub}>Why are you reporting {label}?</Text>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason.value}
              style={styles.option}
              onPress={() => onSelect(reason.value, reason.label)}
            >
              <Text style={styles.optionText}>{reason.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type ConfirmProps = {
  visible: boolean;
  displayName?: string;
  reasonLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReportConfirmModal({
  visible,
  displayName,
  reasonLabel,
  onCancel,
  onConfirm,
}: ConfirmProps) {
  const label = displayName?.trim() || 'this person';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Submit report?</Text>
          <Text style={styles.sub}>
            Report {label} for “{reasonLabel}”. Our moderation queue will review
            it.
          </Text>
          <Pressable style={styles.dangerOption} onPress={onConfirm}>
            <Text style={styles.dangerText}>Submit report</Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Stateful wrapper used by screens that need report flow. */
export function useReportFlow() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    reason: ReportReason;
    label: string;
  } | null>(null);
  const [ctx, setCtx] = useState<{
    userId: string;
    displayName?: string;
    contentType?: string;
    contentId?: string;
    onReported?: () => void;
  } | null>(null);

  const start = (next: NonNullable<typeof ctx>) => {
    setCtx(next);
    setConfirm(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setConfirm(null);
    setCtx(null);
  };

  return {
    start,
    close,
    open,
    confirm,
    setConfirm,
    ctx,
    setOpen,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.inkElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 18,
  },
  sub: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.ink,
  },
  optionText: {
    fontFamily: typography.bodyMedium,
    color: colors.mist,
    fontSize: 15,
  },
  dangerOption: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  dangerText: {
    fontFamily: typography.heading,
    color: colors.danger,
    fontSize: 15,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    fontFamily: typography.bodyMedium,
    color: colors.mistMuted,
    fontSize: 15,
  },
});
