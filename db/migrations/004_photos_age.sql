-- Profile age + chat image/video URLs (apply after 001-003).
-- Memory store needs no migration. Play Store media should move to S3 later.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_age_adult_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_age_adult_check CHECK (
    age IS NULL OR (age >= 18 AND age <= 120)
  );

COMMENT ON COLUMN profiles.age IS
  'User-declared profile age (18+). Preferred over DOB for nearby/display.';

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_body_len;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_body_or_image;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_body_or_media;

ALTER TABLE messages
  ADD CONSTRAINT messages_body_or_media CHECK (
    (char_length(COALESCE(body, '')) BETWEEN 1 AND 2000)
    OR (image_url IS NOT NULL AND char_length(image_url) BETWEEN 1 AND 500)
    OR (video_url IS NOT NULL AND char_length(video_url) BETWEEN 1 AND 500)
  );

COMMENT ON COLUMN messages.image_url IS
  'Relative /uploads/… path or absolute http(s) URL for photo messages.';

COMMENT ON COLUMN messages.video_url IS
  'Relative /uploads/… path or absolute http(s) URL for short video messages (max 30s).';
