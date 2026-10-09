-- Password reset tokens + OAuth users without local password.
-- Safe to re-run.

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id, created_at DESC);

COMMENT ON TABLE password_reset_tokens IS
  'One-time password reset links (store SHA-256 of raw token).';
