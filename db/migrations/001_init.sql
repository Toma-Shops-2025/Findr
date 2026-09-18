-- Findr initial schema sketch (Postgres + PostGIS)
-- Apply after: CREATE EXTENSION IF NOT EXISTS postgis;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Auth identity (vendor subject mapping). DOB used for 18+ gate; not shown publicly.
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject    TEXT NOT NULL UNIQUE,
  email           TEXT UNIQUE,
  phone           TEXT,
  password_hash   TEXT,
  date_of_birth   DATE NOT NULL,
  tos_accepted_at TIMESTAMPTZ,
  privacy_accepted_at TIMESTAMPTZ,
  is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_adult_check CHECK (date_of_birth <= (CURRENT_DATE - INTERVAL '18 years'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name         TEXT NOT NULL,
  bio                  TEXT,
  gender_identity      TEXT,
  orientations_shown   TEXT[] NOT NULL DEFAULT '{}',
  orientations_seeking TEXT[] NOT NULL DEFAULT '{}',
  looking_for          TEXT[] NOT NULL DEFAULT '{}',
  photo_urls           TEXT[] NOT NULL DEFAULT '{}',
  is_visible           BOOLEAN NOT NULL DEFAULT TRUE,
  last_active_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coarse / fuzzed location only — never expose exact pin to clients.
CREATE TABLE IF NOT EXISTS user_locations (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- geography point in WGS84; store fuzzed coordinates from the API
  geom         geography(Point, 4326) NOT NULL,
  accuracy_m   INTEGER,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_locations_geom_gix
  ON user_locations USING GIST (geom);

CREATE TABLE IF NOT EXISTS blocks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  details         TEXT,
  evidence_json   JSONB,
  status          TEXT NOT NULL DEFAULT 'open', -- open | reviewing | actioned | dismissed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  CONSTRAINT reports_no_self CHECK (reporter_id <> target_user_id)
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, created_at DESC);

-- Example nearby query (sketch; implement in API):
-- SELECT p.user_id, p.display_name,
--   ST_Distance(ul.geom, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) AS distance_m
-- FROM user_locations ul
-- JOIN profiles p ON p.user_id = ul.user_id
-- WHERE p.is_visible
--   AND ST_DWithin(ul.geom, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, $radius_m)
-- ORDER BY distance_m
-- LIMIT 50;
