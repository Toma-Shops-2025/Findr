/** Profile field shapes — inclusive enums as extensible lists. */
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
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileUpdateInput = {
  displayName: string;
  bio?: string;
  genderIdentity?: string;
  orientationsShown?: string[];
  orientationsSeeking?: string[];
  lookingFor?: LookingFor[];
  /** Absolute http(s), /uploads/… paths, or stub: placeholders. */
  photoUrls?: string[];
  /** When set, must be >= 18 (server-validated). */
  age?: number | null;
  isVisible?: boolean;
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
  lastActiveAt: string | null;
  updatedAt: string;
  exists: boolean;
};
