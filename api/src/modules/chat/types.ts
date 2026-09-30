export type ConversationRecord = {
  id: string;
  userAId: string;
  userBId: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Approximate chat location pin (client rounds ~3 decimals / ~100m by default). */
export type MessageLocation = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  sharedAt: string;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  /** Relative /uploads/… or absolute http(s) URL when message includes an image. */
  imageUrl: string | null;
  /** Relative /uploads/… or absolute http(s) URL for short video (max 30s). */
  videoUrl: string | null;
  location: MessageLocation | null;
  createdAt: string;
};

export type MessageWithLikes = MessageRecord & {
  likedByMe: boolean;
  likeCount: number;
};

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
  location: MessageLocation | null;
  createdAt: string;
  mine: boolean;
  likedByMe: boolean;
  likeCount: number;
};

export type SendMessageInput = {
  body: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  location?: {
    lat: number;
    lng: number;
    accuracyM?: number | null;
  } | null;
};
