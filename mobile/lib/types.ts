export type LookingFor =
  | 'dates'
  | 'friends'
  | 'casual'
  | 'relationship'
  | 'networking';

export type PublicProfile = {
  userId: string;
  displayName: string;
  bio: string;
  genderIdentity: string;
  orientationsShown: string[];
  orientationsSeeking: string[];
  lookingFor: LookingFor[];
  photoUrls: string[];
  age: number | null;
  isVisible: boolean;
  lastActiveAt: string | null;
  updatedAt: string;
  exists: boolean;
};

export type NearbyCard = {
  userId: string;
  displayName: string;
  age: number | null;
  photoUrls: string[];
  lookingFor: string[];
  distanceLabel: string;
  online: boolean;
};

export type ProfileUpdateInput = {
  displayName: string;
  bio?: string;
  genderIdentity?: string;
  orientationsShown?: string[];
  orientationsSeeking?: string[];
  lookingFor?: LookingFor[];
  photoUrls?: string[];
  age?: number | null;
  isVisible?: boolean;
};

export const LOOKING_FOR_OPTIONS: LookingFor[] = [
  'dates',
  'friends',
  'casual',
  'relationship',
  'networking',
];

export type ConversationSummary = {
  id: string;
  peerUserId: string;
  peerDisplayName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
};

export type PublicMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  mine: boolean;
};

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'underage_suspicion'
  | 'scam'
  | 'non_consensual_imagery'
  | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'underage_suspicion', label: 'Suspected underage' },
  { value: 'scam', label: 'Scam / fraud' },
  { value: 'non_consensual_imagery', label: 'Non-consensual imagery' },
  { value: 'other', label: 'Other' },
];

export type BlockedUser = {
  userId: string;
  displayName: string;
  createdAt: string;
};
