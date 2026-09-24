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
  /** Photo URL stubs until media upload pipeline exists. */
  photoUrls?: string[];
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
  /** Derived from DOB — never expose raw DOB on profiles. */
  age: number;
  isVisible: boolean;
  lastActiveAt: string | null;
  updatedAt: string;
  exists: boolean;
};
