#!/usr/bin/env node
/**
 * List applied vs pending SQL migrations for DATABASE_URL.
 *
 * Usage (PowerShell):
 *   cd C:\Users\SexyMimi\Findr\api
 *   $env:DATABASE_URL = "<render-external-url>"
 *   node ..\db\scripts\migration-status.mjs
 */
import { readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const migrationsDir = resolve(repoRoot, 'db', 'migrations');
const apiPkg = resolve(repoRoot, 'api', 'package.json');

const require = createRequire(apiPkg);
const pg = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const pool = new pg.Pool({ connectionString: databaseUrl });

async function appliedSet() {
  const hasTable = await pool.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    LIMIT 1`);
  if (hasTable.rowCount === 0) {
    return { tracked: false, names: new Set() };
  }
  const res = await pool.query('SELECT name FROM schema_migrations ORDER BY name');
  return {
    tracked: true,
    names: new Set(res.rows.map((r) => String(r.name))),
  };
}

/** Heuristic when schema_migrations was never used (legacy manual applies). */
async function inferLegacy() {
  const inferred = new Set();
  const checks = [
    ['001_init.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1`],
    ['002_chat.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' LIMIT 1`],
    ['011_chat_read_receipts.sql', `SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'peer_a_last_read_at' LIMIT 1`],
    ['012_share_chat_distance.sql', `SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'share_chat_distance' LIMIT 1`],
    ['013_schema_migrations.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations' LIMIT 1`],
    ['014_push_favorites_guidelines.sql', `SELECT 1 FROM information_schema.tables WHERE table_name = 'push_devices' LIMIT 1`],
  ];
  for (const [name, sql] of checks) {
    const r = await pool.query(sql);
    if (r.rowCount > 0) inferred.add(name);
  }
  return inferred;
}

try {
  const { tracked, names } = await appliedSet();
  const legacy = tracked ? names : await inferLegacy();

  console.log(tracked ? 'Migration tracking: schema_migrations table' : 'Migration tracking: inferred from schema (run 013 + apply-pending to formalize)');
  console.log('');

  let pending = 0;
  for (const file of files) {
    const ok = names.has(file) || legacy.has(file);
    console.log(`${ok ? 'OK  ' : 'PEND'}  ${file}`);
    if (!ok) pending += 1;
  }
  console.log('');
  if (pending === 0) {
    console.log('All migration files appear applied.');
  } else {
    console.log(`${pending} pending. Apply with:`);
    console.log('  node ../db/scripts/apply-pending-migrations.mjs');
  }
} finally {
  await pool.end();
}
