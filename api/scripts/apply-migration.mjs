#!/usr/bin/env node
/**
 * Apply a SQL migration (uses pg from this package).
 *
 *   cd api
 *   npm install
 *   $env:DATABASE_URL = "postgres://..."
 *   node scripts/apply-migration.mjs ..\db\migrations\009_strip_sample_demo_profiles.sql
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const fileArg = process.argv[2];
if (!fileArg) {
  console.error(
    'Usage: node scripts/apply-migration.mjs <path-to.sql>\nExample: node scripts/apply-migration.mjs ..\\db\\migrations\\009_strip_sample_demo_profiles.sql',
  );
  process.exit(1);
}

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

/** Render external Postgres requires SSL from home PCs. */
if (
  /\.render\.com/i.test(databaseUrl) &&
  !/sslmode=/i.test(databaseUrl)
) {
  databaseUrl += databaseUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
}

const sqlPath = resolve(process.cwd(), fileArg);
const sql = readFileSync(sqlPath, 'utf8');

const pool = new pg.Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 30_000,
  ssl: /\.render\.com/i.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
});
try {
  await pool.query(sql);
  console.log(`Applied migration: ${fileArg}`);
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
