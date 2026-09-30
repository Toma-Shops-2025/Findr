-- Message likes + GPS share in chat (apply after 005_media_album.sql).
-- Memory store needs no migration. Safe to re-run.

CREATE TABLE IF NOT EXISTS message_likes (
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_likes_user_idx
  ON message_likes (user_id, created_at DESC);

COMMENT ON TABLE message_likes IS
  'One like per user per message (toggle). Visible in-thread to both sides.';

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS location_accuracy_m DOUBLE PRECISION;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS location_shared_at TIMESTAMPTZ;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_body_or_media;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_body_or_content;

ALTER TABLE messages
  ADD CONSTRAINT messages_body_or_content CHECK (
    (char_length(COALESCE(body, '')) BETWEEN 1 AND 2000)
    OR (image_url IS NOT NULL AND char_length(image_url) BETWEEN 1 AND 500)
    OR (video_url IS NOT NULL AND char_length(video_url) BETWEEN 1 AND 500)
    OR (location_lat IS NOT NULL AND location_lng IS NOT NULL)
  );

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_location_pair;

ALTER TABLE messages
  ADD CONSTRAINT messages_location_pair CHECK (
    (location_lat IS NULL AND location_lng IS NULL)
    OR (
      location_lat IS NOT NULL
      AND location_lng IS NOT NULL
      AND location_lat BETWEEN -90 AND 90
      AND location_lng BETWEEN -180 AND 180
    )
  );

COMMENT ON COLUMN messages.location_lat IS
  'Chat-shared approximate latitude (client rounds to ~3 decimals / ~100m).';

COMMENT ON COLUMN messages.location_lng IS
  'Chat-shared approximate longitude (client rounds to ~3 decimals / ~100m).';

COMMENT ON COLUMN messages.location_accuracy_m IS
  'Optional GPS accuracy in meters from the sharer device.';

COMMENT ON COLUMN messages.location_shared_at IS
  'When the sharer confirmed the safety popup and sent location.';
