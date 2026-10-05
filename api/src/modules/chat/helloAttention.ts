/** Canonical first message for hello-attention (inbox signal). */
export const HELLO_ATTENTION_BODY = 'Hello';

export type HelloAttentionResult = {
  conversationId: string;
  messageId: string;
  created: boolean;
  /** False when rate-limited or thread already has messages. */
  sent: boolean;
};
