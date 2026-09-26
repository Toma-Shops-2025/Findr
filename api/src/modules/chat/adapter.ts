/**
 * Chat vendor adapter interface — swap Stream/Ably/Firebase behind this later.
 * MVP uses first-party REST chat in chatStore + /chat/conversations routes.
 */
export type ChatAdapter = {
  createUserToken: (userId: string) => Promise<string>;
};

export const stubChatAdapter: ChatAdapter = {
  async createUserToken() {
    throw new Error('TODO: wire chat vendor (MVP uses first-party REST chat)');
  },
};
