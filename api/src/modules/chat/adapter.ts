/** Chat vendor adapter interface — swap Stream/Ably/Firebase behind this. */
export type ChatAdapter = {
  createUserToken: (userId: string) => Promise<string>;
};

export const stubChatAdapter: ChatAdapter = {
  async createUserToken() {
    throw new Error('TODO: wire chat vendor');
  },
};
