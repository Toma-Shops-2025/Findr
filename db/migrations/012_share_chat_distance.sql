-- Let users hide their distance from others in 1:1 chat headers.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS share_chat_distance BOOLEAN NOT NULL DEFAULT TRUE;
