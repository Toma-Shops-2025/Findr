-- Per-user read timestamps + last sender for unread badges.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_a_last_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS user_b_last_read_at TIMESTAMPTZ;
