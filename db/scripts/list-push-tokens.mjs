#!/usr/bin/env node
/**
 * List saved Expo push tokens for debugging notifications.
 *
 * PowerShell:
 *   cd C:\Findr\api
 *   $env:DATABASE_URL = "<render-external-url>"
 *   node ..\db\scripts\list-push-tokens.mjs
 *
 * Optional filter: node ..\db\scripts\list-push-tokens.mjs mytomaai@gmail.com
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

const emailFilter = process.argv[2]?.trim().toLowerCase();

const pool = new pg.Pool(pgPoolOptions(databaseUrl));

try {
  const params = [];
  let sql = `
    SELECT u.email, left(pd.expo_push_token, 40) AS token_start, pd.platform, pd.updated_at
    FROM push_devices pd
    JOIN users u ON u.id = pd.user_id
    WHERE u.deleted_at IS NULL
  `;
  if (emailFilter) {
    sql += ` AND lower(u.email) = $1`;
    params.push(emailFilter);
  }
  sql += ` ORDER BY pd.updated_at DESC LIMIT 50`;

  const r = await pool.query(sql, params);
  if (r.rows.length === 0) {
    console.log('NO ROWS — no push tokens saved for that filter.');
  } else {
    console.table(r.rows);
  }
} finally {
  await pool.end();
}
