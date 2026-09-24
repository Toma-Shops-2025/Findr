-- Optional DOB + explicit 18+ age-gate attestation (MVP).
-- Apply after 001_init.sql (and 002_chat.sql if used).
-- Safe to re-run: IF NOT EXISTS / DROP IF EXISTS patterns.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS age_gate_accepted_at TIMESTAMPTZ;

-- Allow signup without DOB when age_gate_accepted_at is set.
ALTER TABLE users
  ALTER COLUMN date_of_birth DROP NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_adult_check;

ALTER TABLE users
  ADD CONSTRAINT users_adult_or_age_gate_check CHECK (
    (
      date_of_birth IS NOT NULL
      AND date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')
    )
    OR age_gate_accepted_at IS NOT NULL
  );

COMMENT ON COLUMN users.date_of_birth IS
  'Optional after MVP age-gate attestation; collect later on profile for age display.';
COMMENT ON COLUMN users.age_gate_accepted_at IS
  'When user attested 18+ via acceptedAgeGate (checkbox). Required if DOB is null.';
