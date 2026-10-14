-- Push devices, favorites, guidelines ack, safety auto-hide counter.

CREATE TABLE IF NOT EXISTS push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS push_devices_user_idx ON push_devices (user_id);

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  favorite_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, favorite_user_id),
  CHECK (user_id <> favorite_user_id)
);

CREATE INDEX IF NOT EXISTS user_favorites_user_idx
  ON user_favorites (user_id, created_at DESC);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS guidelines_ack_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.guidelines_ack_at IS
  'When the user accepted community guidelines in-app (first login).';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS open_safety_reports_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.open_safety_reports_count IS
  'Distinct open reports against this user; auto-hide when threshold reached.';
