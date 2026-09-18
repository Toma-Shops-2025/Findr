export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'underage_suspicion'
  | 'scam'
  | 'non_consensual_imagery'
  | 'other';

export type SafetyAction = {
  reporterId: string;
  targetUserId: string;
  reason: ReportReason;
  details?: string;
};
