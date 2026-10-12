import type pg from 'pg';

import { getPool } from '../db.js';
import type { ReportReason } from './types.js';

export type ReportEvidence = {
  contentType?: string | undefined;
  contentId?: string | undefined;
};

export type CreatedReport = {
  id: string;
  reporterId: string;
  targetUserId: string;
  reason: ReportReason;
  details?: string | undefined;
  evidence: ReportEvidence;
  status: 'open' | 'reviewing' | 'actioned' | 'dismissed';
  createdAt: string;
};

const REASONS: ReportReason[] = [
  'harassment',
  'spam',
  'underage_suspicion',
  'scam',
  'non_consensual_imagery',
  'other',
];

export function parseReportReason(raw: string): ReportReason | null {
  const normalized = raw.trim().toLowerCase();
  return REASONS.includes(normalized as ReportReason)
    ? (normalized as ReportReason)
    : null;
}

class MemoryReportStore {
  private rows: CreatedReport[] = [];

  async create(input: {
    reporterId: string;
    targetUserId: string;
    reason: ReportReason;
    details?: string | undefined;
    evidence?: ReportEvidence;
  }): Promise<CreatedReport> {
    const row: CreatedReport = {
      id: crypto.randomUUID(),
      reporterId: input.reporterId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      ...(input.details !== undefined ? { details: input.details } : {}),
      evidence: input.evidence ?? {},
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    this.rows.push(row);
    return row;
  }

  async listOpen(limit = 50): Promise<CreatedReport[]> {
    return this.rows
      .filter((r) => r.status === 'open')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

class PostgresReportStore {
  constructor(private pool: pg.Pool) {}

  async create(input: {
    reporterId: string;
    targetUserId: string;
    reason: ReportReason;
    details?: string | undefined;
    evidence?: ReportEvidence;
  }): Promise<CreatedReport> {
    const result = await this.pool.query(
      `INSERT INTO reports (reporter_id, target_user_id, reason, details, evidence_json, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'open')
       RETURNING id, reporter_id, target_user_id, reason, details, evidence_json, status, created_at`,
      [
        input.reporterId,
        input.targetUserId,
        input.reason,
        input.details ?? null,
        JSON.stringify(input.evidence ?? {}),
      ],
    );
    const row = result.rows[0];
    const created: CreatedReport = {
      id: String(row.id),
      reporterId: String(row.reporter_id),
      targetUserId: String(row.target_user_id),
      reason: row.reason as ReportReason,
      evidence: (row.evidence_json as ReportEvidence) ?? {},
      status: row.status as CreatedReport['status'],
      createdAt: new Date(row.created_at).toISOString(),
    };
    if (row.details) created.details = String(row.details);
    return created;
  }

  async listOpen(limit = 50): Promise<CreatedReport[]> {
    const result = await this.pool.query(
      `SELECT id, reporter_id, target_user_id, reason, details, evidence_json, status, created_at
       FROM reports
       WHERE status = 'open'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((row) => {
      const item: CreatedReport = {
        id: String(row.id),
        reporterId: String(row.reporter_id),
        targetUserId: String(row.target_user_id),
        reason: row.reason as ReportReason,
        evidence: (row.evidence_json as ReportEvidence) ?? {},
        status: row.status as CreatedReport['status'],
        createdAt: new Date(row.created_at).toISOString(),
      };
      if (row.details) item.details = String(row.details);
      return item;
    });
  }
}

let storePromise: Promise<MemoryReportStore | PostgresReportStore> | null = null;

export async function getReportStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) return new MemoryReportStore();
      return new PostgresReportStore(pool);
    })();
  }
  return storePromise;
}
