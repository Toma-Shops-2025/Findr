import bcrypt from 'bcryptjs';
import type pg from 'pg';

import { getPool } from '../db.js';
import { isAdult, normalizeEmail } from './ageGate.js';

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  /** Null when user attested 18+ without submitting DOB (MVP). */
  dateOfBirth: string | null;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  ageGateAcceptedAt: string | null;
  createdAt: string;
};

export type PublicUser = {
  id: string;
  email: string;
  dateOfBirth: string | null;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  ageGateAcceptedAt: string | null;
  createdAt: string;
};

export type SignupInput = {
  email: string;
  password: string;
  dateOfBirth?: string;
  acceptedAgeGate: boolean;
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
    ageGateAcceptedAt: user.ageGateAcceptedAt,
    createdAt: user.createdAt,
  };
}

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    dateOfBirth:
      row.date_of_birth == null ? null : String(row.date_of_birth),
    tosAcceptedAt: isoOrNull(row.tos_accepted_at),
    privacyAcceptedAt: isoOrNull(row.privacy_accepted_at),
    ageGateAcceptedAt: isoOrNull(row.age_gate_accepted_at),
    createdAt: isoOrNull(row.created_at) ?? new Date().toISOString(),
  };
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function assertSignupGate(input: SignupInput): void {
  if (!input.acceptedAgeGate) {
    throw Object.assign(new Error('age_gate_required'), {
      code: 'age_gate_required',
    });
  }
  if (input.dateOfBirth && !isAdult(input.dateOfBirth)) {
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
    assertSignupGate(input);

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email,
      passwordHash: await bcrypt.hash(input.password, 10),
      dateOfBirth: input.dateOfBirth ?? null,
      tosAcceptedAt: now,
      privacyAcceptedAt: now,
      ageGateAcceptedAt: now,
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

  /** Demo / nearby helpers — memory only. */
  async listIds(): Promise<string[]> {
    return [...this.usersById.keys()];
  }
}

class PostgresUserStore {
  constructor(private pool: pg.Pool) {}

  async create(input: SignupInput): Promise<PublicUser> {
    const email = normalizeEmail(input.email);
    assertSignupGate(input);

    const passwordHash = await bcrypt.hash(input.password, 10);
    const authSubject = `email:${email}`;
    const dob = input.dateOfBirth ?? null;

    try {
      const result = await this.pool.query(
        `INSERT INTO users (
           auth_subject, email, password_hash, date_of_birth,
           tos_accepted_at, privacy_accepted_at, age_gate_accepted_at
         ) VALUES ($1, $2, $3, $4::date, now(), now(), now())
         RETURNING id, email, date_of_birth::text AS date_of_birth,
                   tos_accepted_at, privacy_accepted_at, age_gate_accepted_at,
                   created_at`,
        [authSubject, email, passwordHash, dob],
      );
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        dateOfBirth: row.date_of_birth == null ? null : row.date_of_birth,
        tosAcceptedAt: isoOrNull(row.tos_accepted_at),
        privacyAcceptedAt: isoOrNull(row.privacy_accepted_at),
        ageGateAcceptedAt: isoOrNull(row.age_gate_accepted_at),
        createdAt: isoOrNull(row.created_at) ?? new Date().toISOString(),
      };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === '23505') {
        throw Object.assign(new Error('email_taken'), { code: 'email_taken' });
      }
      if (code === '23514') {
        throw Object.assign(new Error('underage'), { code: 'underage' });
      }
      // Column age_gate_accepted_at missing — retry without it (pre-migration).
      if (code === '42703') {
        const result = await this.pool.query(
          `INSERT INTO users (
             auth_subject, email, password_hash, date_of_birth,
             tos_accepted_at, privacy_accepted_at
           ) VALUES ($1, $2, $3, COALESCE($4::date, (CURRENT_DATE - INTERVAL '18 years')), now(), now())
           RETURNING id, email, date_of_birth::text AS date_of_birth,
                     tos_accepted_at, privacy_accepted_at, created_at`,
          [authSubject, email, passwordHash, dob],
        );
        const row = result.rows[0];
        return {
          id: row.id,
          email: row.email,
          dateOfBirth: row.date_of_birth == null ? null : row.date_of_birth,
          tosAcceptedAt: isoOrNull(row.tos_accepted_at),
          privacyAcceptedAt: isoOrNull(row.privacy_accepted_at),
          ageGateAcceptedAt: isoOrNull(row.tos_accepted_at),
          createdAt: isoOrNull(row.created_at) ?? new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT id, email, password_hash, date_of_birth::text AS date_of_birth,
              tos_accepted_at, privacy_accepted_at,
              age_gate_accepted_at, created_at
       FROM users
       WHERE lower(email) = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [normalizeEmail(email)],
    );
    const row = result.rows[0];
    return row ? rowToUser(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      `SELECT id, email, password_hash, date_of_birth::text AS date_of_birth,
              tos_accepted_at, privacy_accepted_at,
              age_gate_accepted_at, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? rowToUser(row) : null;
  }
}

export type UserStore = MemoryUserStore | PostgresUserStore;

let storePromise: Promise<UserStore> | null = null;

export async function getUserStore(): Promise<UserStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) return new MemoryUserStore();
      return new PostgresUserStore(pool);
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
