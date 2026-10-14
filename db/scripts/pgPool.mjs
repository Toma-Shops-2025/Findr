/** Shared Postgres pool options (Render external needs SSL from home PC). */
export function pgPoolOptions(databaseUrl) {
  const opts = { connectionString: databaseUrl, max: 2 };
  if (
    databaseUrl.includes('render.com') ||
    databaseUrl.includes('sslmode=require')
  ) {
    opts.ssl = { rejectUnauthorized: false };
  }
  return opts;
}

export async function connectWithRetry(pool, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await pool.connect();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}
