-- Hello attention pings (Stage 2e / mobile versionCode 19).
-- Apply after 006_message_likes_location.sql.
-- Memory chat store enforces the same daily pair limit without this table.

CREATE TABLE IF NOT EXISTS hello_attentions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id       UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hello_attentions_no_self CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS hello_attentions_recipient_created_idx
  ON hello_attentions (recipient_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS hello_attentions_sender_recipient_day_idx
  ON hello_attentions (
    sender_id,
    recipient_id,
    ((timezone('UTC', created_at))::date)
  );

COMMENT ON TABLE hello_attentions IS
  'One hello-attention ping per sender/recipient per UTC day; opens inbox with a Hello message.';
