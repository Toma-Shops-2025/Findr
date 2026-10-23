#!/usr/bin/env node
/**
 * Keep only the newest push_devices row per user (optional one-time cleanup).
 *
 *   cd C:\Findr\api
 *   $env:DATABASE_URL = "<render-external-url>"
 *   node ..\db\scripts\prune-stale-push-tokens.mjs
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pgPoolOptions } from './pgConnection.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiPkg = resolve(__dirname, '..', '..', 'api', 'package.json');
const require = createRequire(apiPkg);
const pg = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new pg.Pool(pgPoolOptions(databaseUrl));

try {
  const before = await pool.query(
    `SELECT COUNT(*)::int AS n FROM push_devices`,
  );
  const del = await pool.query(
    `DELETE FROM push_devices pd
     WHERE pd.expo_push_token <> (
       SELECT expo_push_token FROM push_devices
       WHERE user_id = pd.user_id
       ORDER BY updated_at DESC
       LIMIT 1
     )`,
  );
  const after = await pool.query(
    `SELECT COUNT(*)::int AS n FROM push_devices`,
  );
  console.log(
    `Removed ${del.rowCount ?? 0} stale row(s). ${before.rows[0].n} -> ${after.rows[0].n} total.`,
  );
} finally {
  await pool.end();
}
