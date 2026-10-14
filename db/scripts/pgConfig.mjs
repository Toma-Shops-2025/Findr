/**
 * Postgres pool config for migration scripts (Render needs SSL from home PC).
 */
export function pgPoolOptions(databaseUrl) {
  const opts = { connectionString: databaseUrl };
  const needsSsl =
    databaseUrl.includes('render.com') ||
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('ssl=true');
  if (needsSsl) {
    opts.ssl = { rejectUnauthorized: false };
  }
  return opts;
}
