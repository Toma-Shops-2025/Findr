-- Personal media album (photos + short videos). Apply after 004_photos_age.sql.

CREATE TABLE IF NOT EXISTS user_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  url TEXT NOT NULL,
  mime TEXT,
  bytes INTEGER,
  duration_ms INTEGER,
  source TEXT NOT NULL DEFAULT 'upload'
    CHECK (source IN ('upload', 'chat', 'camera', 'profile', 'album')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_media_user_created_idx
  ON user_media (user_id, created_at DESC);

COMMENT ON TABLE user_media IS
  'Per-user personal album. Chat/camera captures are saved here for reuse.';
