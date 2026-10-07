#!/usr/bin/env node
/**
 * Apply one SQL migration file using DATABASE_URL (node + pg).
 * pg is resolved from api/node_modules (run `npm install` in api/ once).
 *
 * Usage (from repo root):
 *   cd api && npm install
 *   $env:DATABASE_URL = "postgres://..."
 *   node ../db/scripts/apply-migration.mjs ../db/migrations/009_strip_sample_demo_profiles.sql
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const apiPkg = resolve(repoRoot, 'api', 'package.json');

if (!existsSync(apiPkg)) {
  console.error('Missing api/package.json. Run from the Findr repo root.');
  process.exit(1);
}

const require = createRequire(apiPkg);
let pg;
try {
  pg = require('pg');
} catch {
  console.error(
    'Cannot load pg. Run: cd api && npm install\nThen retry this command.',
  );
  process.exit(1);
}

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Usage: node db/scripts/apply-migration.mjs <path-to.sql>');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), fileArg);
const sql = readFileSync(sqlPath, 'utf8');

const pool = new pg.Pool({ connectionString: databaseUrl });
try {
  await pool.query(sql);
  console.log(`Applied migration: ${fileArg}`);
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
