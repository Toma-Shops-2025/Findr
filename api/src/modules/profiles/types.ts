/** Profile field shapes — inclusive enums as extensible lists. */
export type LookingFor =
  | 'dates'
  | 'friends'
  | 'casual'
  | 'relationship'
  | 'networking';

export type ProfileDraft = {
  displayName: string;
  bio?: string;
  genderIdentity?: string;
  orientationsShown?: string[];
  orientationsSeeking?: string[];
  lookingFor?: LookingFor[];
};
