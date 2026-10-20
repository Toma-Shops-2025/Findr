-- Link Google Sign-In to existing email/password accounts (same email).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
  ON users (google_sub)
  WHERE google_sub IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN users.google_sub IS
  'Google account subject (OIDC sub). Lets users with email/password also sign in with Google.';
