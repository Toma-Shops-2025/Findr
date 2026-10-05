#!/usr/bin/env node
/**
 * Apply one SQL migration file using DATABASE_URL (node + pg).
 * Usage: node db/scripts/apply-migration.mjs db/migrations/008_hello_attention.sql
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

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
