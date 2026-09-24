import pg from 'pg';

const { Pool } = pg;

let poolPromise: Promise<pg.Pool | null> | null = null;

/**
 * Shared Postgres pool. Returns null when DATABASE_URL is unset or unreachable
 * so auth / profiles / geo can fall back to in-memory stores together.
 */
export async function getPool(): Promise<pg.Pool | null> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        console.warn(
          '[findr-api] DATABASE_URL unset — using in-memory stores (auth, profiles, geo, chat)',
        );
        return null;
      }
      try {
        const pool = new Pool({ connectionString: databaseUrl });
        await pool.query('SELECT 1');
        console.info('[findr-api] connected to Postgres');
        return pool;
      } catch (err) {
        console.warn(
          '[findr-api] Postgres unavailable — falling back to in-memory stores',
          err,
        );
        return null;
      }
    })();
  }
  return poolPromise;
}

export type { Pool };
