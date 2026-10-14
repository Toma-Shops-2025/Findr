-- Tracks which SQL migrations have been applied (run once on every environment).
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE schema_migrations IS
  'One row per applied db/migrations/*.sql file (basename).';
