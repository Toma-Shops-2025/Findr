import type pg from 'pg';

import { getPool } from '../db.js';
import {
  fuzzCoordinate,
  haversineMeters,
  type CoarseLocation,
} from './coarseLocation.js';

function nowIso(): string {
  return new Date().toISOString();
}

class MemoryLocationStore {
  private byUserId = new Map<string, CoarseLocation>();

  async upsert(
    userId: string,
    latitude: number,
    longitude: number,
    accuracyM?: number | null,
  ): Promise<CoarseLocation> {
    const stamp = nowIso();
    const next: CoarseLocation = {
      userId,
      latitude: fuzzCoordinate(latitude),
      longitude: fuzzCoordinate(longitude),
      accuracyM: accuracyM ?? null,
      recordedAt: stamp,
      updatedAt: stamp,
    };
    this.byUserId.set(userId, next);
    return next;
  }

  async get(userId: string): Promise<CoarseLocation | null> {
    return this.byUserId.get(userId) ?? null;
  }

  async listExcept(excludeUserId: string): Promise<CoarseLocation[]> {
    return [...this.byUserId.values()].filter((l) => l.userId !== excludeUserId);
  }

  async nearbyWithin(
    latitude: number,
    longitude: number,
    radiusM: number,
    excludeUserId: string,
  ): Promise<Array<CoarseLocation & { distanceM: number }>> {
    const results: Array<CoarseLocation & { distanceM: number }> = [];
    for (const loc of this.byUserId.values()) {
      if (loc.userId === excludeUserId) continue;
      const distanceM = haversineMeters(
        latitude,
        longitude,
        loc.latitude,
        loc.longitude,
      );
      if (distanceM <= radiusM) {
        results.push({ ...loc, distanceM });
      }
    }
    results.sort((a, b) => a.distanceM - b.distanceM);
    return results;
  }
}

class PostgresLocationStore {
  constructor(private pool: pg.Pool) {}

  async upsert(
    userId: string,
    latitude: number,
    longitude: number,
    accuracyM?: number | null,
  ): Promise<CoarseLocation> {
    const lat = fuzzCoordinate(latitude);
    const lng = fuzzCoordinate(longitude);
    const result = await this.pool.query(
      `INSERT INTO user_locations (user_id, geom, accuracy_m, recorded_at, updated_at)
       VALUES (
         $1,
         ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
         $4,
         now(),
         now()
       )
       ON CONFLICT (user_id) DO UPDATE SET
         geom = EXCLUDED.geom,
         accuracy_m = EXCLUDED.accuracy_m,
         recorded_at = now(),
         updated_at = now()
       RETURNING user_id,
         ST_Y(geom::geometry) AS latitude,
         ST_X(geom::geometry) AS longitude,
         accuracy_m,
         recorded_at,
         updated_at`,
      [userId, lng, lat, accuracyM ?? null],
    );
    return rowToLocation(result.rows[0]);
  }

  async get(userId: string): Promise<CoarseLocation | null> {
    const result = await this.pool.query(
      `SELECT user_id,
              ST_Y(geom::geometry) AS latitude,
              ST_X(geom::geometry) AS longitude,
              accuracy_m, recorded_at, updated_at
       FROM user_locations
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? rowToLocation(row) : null;
  }

  /**
   * PostGIS nearby query. TODO: add freshness TTL filter on updated_at when product locks it.
   */
  async nearbyWithin(
    latitude: number,
    longitude: number,
    radiusM: number,
    excludeUserId: string,
  ): Promise<Array<CoarseLocation & { distanceM: number }>> {
    const result = await this.pool.query(
      `SELECT user_id,
              ST_Y(geom::geometry) AS latitude,
              ST_X(geom::geometry) AS longitude,
              accuracy_m, recorded_at, updated_at,
              ST_Distance(
                geom,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
              ) AS distance_m
       FROM user_locations
       WHERE user_id <> $3
         AND ST_DWithin(
           geom,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           $4
         )
       ORDER BY distance_m ASC
       LIMIT 100`,
      [longitude, latitude, excludeUserId, radiusM],
    );
    return result.rows.map((row) => ({
      ...rowToLocation(row),
      distanceM: Number(row.distance_m),
    }));
  }
}

function rowToLocation(row: Record<string, unknown>): CoarseLocation {
  return {
    userId: String(row.user_id),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracyM: row.accuracy_m == null ? null : Number(row.accuracy_m),
    recordedAt:
      row.recorded_at instanceof Date
        ? row.recorded_at.toISOString()
        : String(row.recorded_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

export type LocationStore = MemoryLocationStore | PostgresLocationStore;

export type GeoMode = 'postgis' | 'memory';

let storePromise: Promise<{ store: LocationStore; mode: GeoMode }> | null =
  null;

export async function getLocationStore(): Promise<{
  store: LocationStore;
  mode: GeoMode;
}> {
  if (!storePromise) {
    storePromise = (async () => {
      const pool = await getPool();
      if (!pool) {
        return { store: new MemoryLocationStore(), mode: 'memory' as const };
      }
      // Confirm PostGIS is available; otherwise fall back with a clear TODO.
      try {
        await pool.query('SELECT PostGIS_Version()');
        return { store: new PostgresLocationStore(pool), mode: 'postgis' as const };
      } catch (err) {
        console.warn(
          '[findr-api] PostGIS unavailable — TODO: enable PostGIS; using in-memory geo',
          err,
        );
        return { store: new MemoryLocationStore(), mode: 'memory' as const };
      }
    })();
  }
  return storePromise;
}
