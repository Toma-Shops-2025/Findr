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
  createdAt: string;
  mine: boolean;
};
