import { createHash, randomBytes } from 'node:crypto';
import type pg from 'pg';

import { sendTransactionalEmail } from '../email/send.js';
import { getPool } from '../db.js';
import { getUserStore } from './userStore.js';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function resetBaseUrl(): string {
  return (
    process.env.PASSWORD_RESET_URL_BASE?.trim() ??
    'https://myfindr.fun/reset-password'
  ).replace(/\/$/, '');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const store = await getUserStore();
  const user = await store.findByEmail(email);
  if (!user) {
    return;
  }
  if (!user.passwordHash) {
    return;
  }

  const pool = await getPool();
  if (!pool) {
    console.warn('[findr-auth] password reset requires DATABASE_URL');
    return;
  }

  const raw = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt.toISOString()],
  );

  const link = `${resetBaseUrl()}/?token=${encodeURIComponent(raw)}`;
  await sendTransactionalEmail({
    to: user.email,
    subject: 'Reset your Findr password',
    text: [
      'You requested a password reset for Findr.',
      '',
      `Open this link within 1 hour:`,
      link,
      '',
      'If you did not request this, ignore this email.',
    ].join('\n'),
    html: `<p>You requested a password reset for Findr.</p><p><a href="${link}">Reset password</a></p><p>Link expires in 1 hour.</p>`,
  });
}

export async function completePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<'ok' | 'invalid' | 'weak'> {
  if (newPassword.length < 8) {
    return 'weak';
  }

  const pool = await getPool();
  if (!pool) {
    return 'invalid';
  }

  const tokenHash = hashToken(rawToken);
  const result = await pool.query(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row || row.used_at) {
    return 'invalid';
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return 'invalid';
  }

  const store = await getUserStore();
  const updated = await store.setPassword(String(row.user_id), newPassword);
  if (!updated) {
    return 'invalid';
  }

  await pool.query(
    `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
    [row.id],
  );

  return 'ok';
}
