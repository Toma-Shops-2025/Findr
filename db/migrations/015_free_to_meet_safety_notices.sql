-- Free to meet (time-boxed intent) + reporter closure notices.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_to_meet_until TIMESTAMPTZ;

COMMENT ON COLUMN profiles.free_to_meet_until IS
  'When set and in the future, user shows Free to meet on Nearby. Expires automatically.';

CREATE TABLE IF NOT EXISTS safety_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'report_update',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS safety_notices_user_unread_idx
  ON safety_notices (user_id, created_at DESC)
  WHERE read_at IS NULL;
