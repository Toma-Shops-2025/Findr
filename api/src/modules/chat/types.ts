export type ConversationRecord = {
  id: string;
  userAId: string;
  userBId: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
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
  createdAt: string;
  mine: boolean;
};

export type SendMessageInput = {
  body: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
};
