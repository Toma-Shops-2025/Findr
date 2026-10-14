#!/usr/bin/env node
/**
 * Apply all db/migrations/*.sql not yet recorded in schema_migrations.
 *
 * Usage:
 *   cd api && $env:DATABASE_URL="..." && node ../db/scripts/apply-pending-migrations.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const migrationsDir = resolve(repoRoot, 'db', 'migrations');
const apiPkg = resolve(repoRoot, 'api', 'package.json');

if (!existsSync(apiPkg)) {
  console.error('Missing api/package.json');
  process.exit(1);
}

const require = createRequire(apiPkg);
const pg = require('pg');
const { pgPoolOptions } = await import('./pgConfig.mjs');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const pool = new pg.Pool({ connectionString: databaseUrl });

async function ensureTrackingTable(client) {
  const sql = readFileSync(
    resolve(migrationsDir, '013_schema_migrations.sql'),
    'utf8',
  );
  await client.query(sql);
}

async function appliedNames(client) {
  const res = await client.query('SELECT name FROM schema_migrations');
  return new Set(res.rows.map((r) => String(r.name)));
}

const client = await pool.connect();
try {
  await ensureTrackingTable(client);
  const applied = await appliedNames(client);

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip ${file}`);
      continue;
    }
    const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [file],
      );
      await client.query('COMMIT');
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`failed ${file}:`, err);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  client.release();
  await pool.end();
}
