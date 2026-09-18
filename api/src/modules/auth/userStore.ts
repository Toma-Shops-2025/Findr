import bcrypt from 'bcryptjs';
import pg from 'pg';

import { isAdult, normalizeEmail } from './ageGate.js';

const { Pool } = pg;

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  dateOfBirth: string;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  createdAt: string;
};

export type PublicUser = {
  id: string;
  email: string;
  dateOfBirth: string;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  createdAt: string;
};

export type SignupInput = {
  email: string;
  password: string;
  dateOfBirth: string;
  tosAccepted: boolean;
  privacyAccepted: boolean;
};

function toPublic(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    tosAcceptedAt: user.tosAcceptedAt,
    privacyAcceptedAt: user.privacyAcceptedAt,
    createdAt: user.createdAt,
  };
}

/** In-memory store for Expo Go smoke tests without Docker. */
class MemoryUserStore {
  private usersByEmail = new Map<string, UserRecord>();
  private usersById = new Map<string, UserRecord>();

  async create(input: SignupInput): Promise<PublicUser> {
    const email = normalizeEmail(input.email);
    if (this.usersByEmail.has(email)) {
      throw Object.assign(new Error('email_taken'), { code: 'email_taken' });
    }
    if (!isAdult(input.dateOfBirth)) {
      throw Object.assign(new Error('underage'), { code: 'underage' });
    }
    if (!input.tosAccepted || !input.privacyAccepted) {
      throw Object.assign(new Error('legal_required'), { code: 'legal_required' });
    }
    if (input.password.length < 8) {
      throw Object.assign(new Error('password_too_short'), {
        code: 'password_too_short',
      });
    }

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email,
      passwordHash: await bcrypt.hash(input.password, 10),
      dateOfBirth: input.dateOfBirth,
      tosAcceptedAt: now,
      privacyAcceptedAt: now,
      createdAt: now,
    };
    this.usersByEmail.set(email, user);
    this.usersById.set(user.id, user);
    return toPublic(user);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.usersByEmail.get(normalizeEmail(email)) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.usersById.get(id) ?? null;
  }
}

class PostgresUserStore {
  constructor(private pool: pg.Pool) {}

  async create(input: SignupInput): Promise<PublicUser> {
    const email = normalizeEmail(input.email);
    if (!isAdult(input.dateOfBirth)) {
      throw Object.assign(new Error('underage'), { code: 'underage' });
    }
    if (!input.tosAccepted || !input.privacyAccepted) {
      throw Object.assign(new Error('legal_required'), { code: 'legal_required' });
    }
    if (input.password.length < 8) {
      throw Object.assign(new Error('password_too_short'), {
        code: 'password_too_short',
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const authSubject = `email:${email}`;

    try {
      const result = await this.pool.query(
        `INSERT INTO users (
           auth_subject, email, password_hash, date_of_birth,
           tos_accepted_at, privacy_accepted_at
         ) VALUES ($1, $2, $3, $4::date, now(), now())
         RETURNING id, email, date_of_birth::text AS date_of_birth,
                   tos_accepted_at, privacy_accepted_at, created_at`,
        [authSubject, email, passwordHash, input.dateOfBirth],
      );
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        dateOfBirth: row.date_of_birth,
        tosAcceptedAt: row.tos_accepted_at?.toISOString?.() ?? row.tos_accepted_at,
        privacyAcceptedAt:
          row.privacy_accepted_at?.toISOString?.() ?? row.privacy_accepted_at,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === '23505') {
        throw Object.assign(new Error('email_taken'), { code: 'email_taken' });
      }
      if (code === '23514') {
        throw Object.assign(new Error('underage'), { code: 'underage' });
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT id, email, password_hash, date_of_birth::text AS date_of_birth,
              tos_accepted_at, privacy_accepted_at, created_at
       FROM users
       WHERE lower(email) = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [normalizeEmail(email)],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      dateOfBirth: row.date_of_birth,
      tosAcceptedAt: row.tos_accepted_at?.toISOString?.() ?? row.tos_accepted_at,
      privacyAcceptedAt:
        row.privacy_accepted_at?.toISOString?.() ?? row.privacy_accepted_at,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT id, email, password_hash, date_of_birth::text AS date_of_birth,
              tos_accepted_at, privacy_accepted_at, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      dateOfBirth: row.date_of_birth,
      tosAcceptedAt: row.tos_accepted_at?.toISOString?.() ?? row.tos_accepted_at,
      privacyAcceptedAt:
        row.privacy_accepted_at?.toISOString?.() ?? row.privacy_accepted_at,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    };
  }
}

export type UserStore = MemoryUserStore | PostgresUserStore;

let storePromise: Promise<UserStore> | null = null;

export async function getUserStore(): Promise<UserStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        console.warn('[findr-api] DATABASE_URL unset — using in-memory user store');
        return new MemoryUserStore();
      }
      try {
        const pool = new Pool({ connectionString: databaseUrl });
        await pool.query('SELECT 1');
        console.info('[findr-api] connected to Postgres user store');
        return new PostgresUserStore(pool);
      } catch (err) {
        console.warn(
          '[findr-api] Postgres unavailable — falling back to in-memory store',
          err,
        );
        return new MemoryUserStore();
      }
    })();
  }
  return storePromise;
}

export async function verifyPassword(
  user: UserRecord,
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export { toPublic };
