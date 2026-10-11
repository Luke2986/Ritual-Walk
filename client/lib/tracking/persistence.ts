import * as SQLite from "expo-sqlite";
import { isAcceptableFix, RawFix } from "./geo";

export interface TrackPoint {
  id: number;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
  segment: number;
}

export interface ActiveSession {
  walkId: string;
  startedAt: number;
  pausedMs: number;
  pausedAt: number | null;
  endedAt: number | null;
  segment: number;
  steps: number;
}

interface SessionRow {
  walk_id: string;
  started_at: number;
  paused_ms: number;
  paused_at: number | null;
  ended_at: number | null;
  segment: number;
  steps: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("step_ritual_tracking.db");
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        DROP TABLE IF EXISTS active_walk;
        DROP TABLE IF EXISTS track_points;
        CREATE TABLE IF NOT EXISTS walk_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          walk_id TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          accuracy REAL,
          segment INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_walk_points_walk_id ON walk_points(walk_id, id);
        CREATE TABLE IF NOT EXISTS active_session (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          walk_id TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          paused_ms INTEGER NOT NULL DEFAULT 0,
          paused_at INTEGER,
          ended_at INTEGER,
          segment INTEGER NOT NULL DEFAULT 0,
          steps INTEGER NOT NULL DEFAULT 0
        );
      `);
      return db;
    })();
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function toSession(row: SessionRow): ActiveSession {
  return {
    walkId: row.walk_id,
    startedAt: row.started_at,
    pausedMs: row.paused_ms,
    pausedAt: row.paused_at,
    endedAt: row.ended_at,
    segment: row.segment,
    steps: row.steps,
  };
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>(
    "SELECT * FROM active_session WHERE id = 1",
  );
  return row ? toSession(row) : null;
}

export async function createSession(
  walkId: string,
  startedAt: number,
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM walk_points");
    await db.runAsync(
      "INSERT OR REPLACE INTO active_session (id, walk_id, started_at, paused_ms, paused_at, ended_at, segment, steps) VALUES (1, ?, ?, 0, NULL, NULL, 0, 0)",
      [walkId, startedAt],
    );
  });
}

export async function markPaused(pausedAt: number, steps: number) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE active_session SET paused_at = ?, steps = ? WHERE id = 1 AND paused_at IS NULL",
    [pausedAt, steps],
  );
}

export async function markResumed(resumedAt: number) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE active_session SET paused_ms = paused_ms + (? - paused_at), paused_at = NULL, segment = segment + 1 WHERE id = 1 AND paused_at IS NOT NULL",
    [resumedAt],
  );
}

export async function markEnded(endedAt: number, steps: number) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE active_session SET ended_at = ?, steps = ? WHERE id = 1 AND ended_at IS NULL",
    [endedAt, steps],
  );
}

export async function saveSteps(steps: number) {
  const db = await getDatabase();
  await db.runAsync("UPDATE active_session SET steps = ? WHERE id = 1", [
    steps,
  ]);
}

export async function clearSession(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM walk_points");
    await db.runAsync("DELETE FROM active_session");
  });
}

export async function getTrackPoints(
  walkId: string,
  afterId = 0,
): Promise<TrackPoint[]> {
  const db = await getDatabase();
  return db.getAllAsync<TrackPoint>(
    "SELECT id, latitude, longitude, timestamp, accuracy, segment FROM walk_points WHERE walk_id = ? AND id > ? ORDER BY id ASC",
    [walkId, afterId],
  );
}

// Foreground watcher and background task can both deliver fixes; serialising writes
// keeps the "compare with last stored point" filter consistent.
let writeQueue: Promise<void> = Promise.resolve();

export function persistFixes(fixes: RawFix[]): Promise<void> {
  const run = writeQueue.then(async () => {
    const db = await getDatabase();
    if (fixes.length === 0) return;

    const session = await getActiveSession();
    if (!session || session.pausedAt !== null || session.endedAt !== null) {
      return;
    }

    const lastRow = await db.getFirstAsync<TrackPoint>(
      "SELECT id, latitude, longitude, timestamp, accuracy, segment FROM walk_points WHERE walk_id = ? ORDER BY id DESC LIMIT 1",
      [session.walkId],
    );
    let previous: RawFix | null =
      lastRow && lastRow.segment === session.segment
        ? { ...lastRow, speed: null }
        : null;

    const accepted: RawFix[] = [];
    for (const fix of fixes) {
      if (fix.timestamp < session.startedAt) continue;
      if (previous && fix.timestamp <= previous.timestamp) continue;
      if (isAcceptableFix(fix, previous)) {
        accepted.push(fix);
        previous = fix;
      }
    }
    if (accepted.length === 0) return;

    await db.withTransactionAsync(async () => {
      for (const fix of accepted) {
        await db.runAsync(
          "INSERT INTO walk_points (walk_id, timestamp, latitude, longitude, accuracy, segment) VALUES (?, ?, ?, ?, ?, ?)",
          [
            session.walkId,
            fix.timestamp,
            fix.latitude,
            fix.longitude,
            fix.accuracy,
            session.segment,
          ],
        );
      }
    });
  });
  writeQueue = run.catch(() => {});
  return run;
}
