/**
 * Postgres pool config for local migration scripts (Render external URL needs SSL).
 */
export function pgPoolOptions(connectionString) {
  const isRender =
    connectionString.includes('.render.com') ||
    connectionString.includes('render.com');
  const sslFromEnv = process.env.PGSSLMODE === 'require';
  const sslInUrl = /[?&]sslmode=/i.test(connectionString);

  const options = { connectionString };

  if ((isRender || sslFromEnv) && !sslInUrl) {
    options.ssl = { rejectUnauthorized: false };
  }

  return options;
}
