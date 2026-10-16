/** Profile field shapes â€” inclusive enums as extensible lists. */
export type LookingFor =
  | 'dates'
  | 'friends'
  | 'casual'
  | 'relationship'
  | 'networking';

export const LOOKING_FOR_VALUES: LookingFor[] = [
  'dates',
  'friends',
  'casual',
  'relationship',
  'networking',
];

export type ProfileRecord = {
  userId: string;
  displayName: string;
  bio: string;
  genderIdentity: string;
  orientationsShown: string[];
  orientationsSeeking: string[];
  lookingFor: LookingFor[];
  photoUrls: string[];
  /** Profile-declared age (preferred for display). Null until set on profile edit. */
  age: number | null;
  isVisible: boolean;
  /** When false, others do not see your distance in chat. */
  shareChatDistance: boolean;
  /** ISO timestamp; active when in the future. */
  freeToMeetUntil: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isFreeToMeetActive(until: string | null | undefined): boolean {
  if (!until) return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && t > Date.now();
}

export type ProfileUpdateInput = {
  /** Optional for partial updates (e.g. visibility-only from Safety). */
  displayName?: string;
  bio?: string;
  genderIdentity?: string;
  orientationsShown?: string[];
  orientationsSeeking?: string[];
  lookingFor?: LookingFor[];
  /** Absolute http(s), /uploads/â€¦ paths, or stub: placeholders. */
  photoUrls?: string[];
  /** When set, must be >= 18 (server-validated). */
  age?: number | null;
  isVisible?: boolean;
  shareChatDistance?: boolean;
};

export type PublicProfile = {
  userId: string;
  displayName: string;
  bio: string;
  genderIdentity: string;
  orientationsShown: string[];
  orientationsSeeking: string[];
  lookingFor: LookingFor[];
  photoUrls: string[];
  /**
   * Prefer profile.age when set; else DOB-derived.
   * Never expose raw DOB.
   */
  age: number | null;
  isVisible: boolean;
  shareChatDistance: boolean;
  freeToMeetActive: boolean;
  freeToMeetUntil: string | null;
  lastActiveAt: string | null;
  updatedAt: string;
  exists: boolean;
};
