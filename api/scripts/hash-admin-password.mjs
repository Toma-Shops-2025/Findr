#!/usr/bin/env node
/**
 * Generate ADMIN_PASSWORD_BCRYPT for Render (never commit the password).
 *   node scripts/hash-admin-password.mjs "your-password-here"
 */
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-admin-password.mjs "your-password"');
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
console.log('Set on Render findr-api:');
console.log(`ADMIN_EMAIL=founder@myfindr.fun`);
console.log(`ADMIN_PASSWORD_BCRYPT=${hash}`);
