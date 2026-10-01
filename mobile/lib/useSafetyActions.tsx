import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import {
  ReportConfirmModal,
  ReportReasonModal,
} from '@/components/ReportModals';
import { confirmBlockUser, submitReport, type SafetyContentType } from '@/lib/safety';
import type { ReportReason } from '@/lib/types';

type ReportCtx = {
  userId: string;
  displayName?: string;
  contentType?: SafetyContentType;
  contentId?: string;
  onReported?: () => void;
};

/**
 * Block (Alert) + Report (Modal — Android-safe) for Nearby / profile / chat.
 */
export function useSafetyActions(token: string | null) {
  const [reportCtx, setReportCtx] = useState<ReportCtx | null>(null);
  const [pendingReason, setPendingReason] = useState<{
    reason: ReportReason;
    label: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const blockUser = useCallback(
    (opts: {
      userId: string;
      displayName?: string;
      onBlocked?: () => void;
    }) => {
      if (!token) return;
      confirmBlockUser({ token, ...opts });
    },
    [token],
  );

  const reportUser = useCallback((opts: ReportCtx) => {
    setPendingReason(null);
    setReportCtx(opts);
  }, []);

  const closeReport = useCallback(() => {
    setReportCtx(null);
    setPendingReason(null);
  }, []);

  const onConfirmReport = useCallback(() => {
    if (!token || !reportCtx || !pendingReason || submitting) return;
    setSubmitting(true);
    void (async () => {
      try {
        await submitReport({
          token,
          userId: reportCtx.userId,
          reason: pendingReason.reason,
          contentType: reportCtx.contentType,
          contentId: reportCtx.contentId,
        });
        const done = reportCtx.onReported;
        closeReport();
        Alert.alert('Report sent', 'Thanks — Findr received your report.');
        done?.();
      } catch (err) {
        Alert.alert(
          'Could not report',
          err instanceof Error ? err.message : 'Try again',
        );
      } finally {
        setSubmitting(false);
      }
    })();
  }, [token, reportCtx, pendingReason, submitting, closeReport]);

  const reportModals = (
    <>
      <ReportReasonModal
        visible={!!reportCtx && !pendingReason}
        displayName={reportCtx?.displayName}
        onCancel={closeReport}
        onSelect={(reason, label) => setPendingReason({ reason, label })}
      />
      <ReportConfirmModal
        visible={!!reportCtx && !!pendingReason}
        displayName={reportCtx?.displayName}
        reasonLabel={pendingReason?.label ?? ''}
        onCancel={closeReport}
        onConfirm={onConfirmReport}
      />
    </>
  );

  return { blockUser, reportUser, reportModals };
}
