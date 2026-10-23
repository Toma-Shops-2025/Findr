#!/usr/bin/env node
/**
 * Send one test notification via Expo to a user's saved push token(s).
 *
 *   cd C:\Findr\api
 *   $env:DATABASE_URL = "<render-external-url>"
 *   $env:EXPO_ACCESS_TOKEN = "<expo-access-token>"
 *   node ..\db\scripts\send-test-push.mjs mytomaai@gmail.com
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pgPoolOptions } from './pgConnection.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiPkg = resolve(__dirname, '..', '..', 'api', 'package.json');
const require = createRequire(apiPkg);
const pg = require('pg');

const email = process.argv[2]?.trim().toLowerCase();
const databaseUrl = process.env.DATABASE_URL;
const expoToken = process.env.EXPO_ACCESS_TOKEN?.trim();

if (!email) {
  console.error('Usage: node send-test-push.mjs <email>');
  process.exit(1);
}
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
if (!expoToken) {
  console.error('EXPO_ACCESS_TOKEN is not set (Expo access token, not Firebase JSON).');
  process.exit(1);
}

const pool = new pg.Pool(pgPoolOptions(databaseUrl));

try {
  const r = await pool.query(
    `SELECT expo_push_token FROM push_devices pd
     JOIN users u ON u.id = pd.user_id
     WHERE lower(u.email) = $1 AND u.deleted_at IS NULL
     ORDER BY pd.updated_at DESC
     LIMIT 3`,
    [email],
  );
  if (r.rows.length === 0) {
    console.error('No push tokens for', email);
    process.exit(1);
  }

  const tokens = r.rows.map((row) => String(row.expo_push_token));
  const messages = tokens.map((to) => ({
    to,
    title: 'Findr test',
    body: 'If you see this, Expo push delivery works.',
    channelId: 'messages',
    priority: 'high',
    sound: 'default',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${expoToken}`,
    },
    body: JSON.stringify(messages),
  });
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text);
} finally {
  await pool.end();
}
