-- Findr 1:1 chat tables (apply after 001_init.sql)
-- Path to DB: set DATABASE_URL and run this migration; API uses PostgresChatStore.
-- Without DATABASE_URL the API keeps an in-memory chat store (Expo Go smoke tests).

CREATE TABLE IF NOT EXISTS conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_preview  TEXT,
  last_message_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_ordered CHECK (user_a_id < user_b_id),
  CONSTRAINT conversations_no_self CHECK (user_a_id <> user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS conversations_user_a_idx ON conversations (user_a_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_user_b_idx ON conversations (user_b_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_len CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at ASC);
