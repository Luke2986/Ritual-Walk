import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

export interface TrackPoint {
  id?: number;
  walkId: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
}

export interface ActiveWalk {
  walkId: string;
  startTime: number;
  pausedTime: number;
  isPaused: boolean;
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === "web") {
    return null;
  }
  
  if (!db) {
    db = await SQLite.openDatabaseAsync("step_ritual_tracking.db");
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS track_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        walk_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        altitude REAL,
        accuracy REAL,
        speed REAL,
        heading REAL
      );
      
      CREATE INDEX IF NOT EXISTS idx_track_points_walk_id ON track_points(walk_id);
      
      CREATE TABLE IF NOT EXISTS active_walk (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        walk_id TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        paused_time INTEGER DEFAULT 0,
        is_paused INTEGER DEFAULT 0
      );
    `);
  }
  
  return db;
}

export async function persistLocationsBatch(
  walkId: string,
  locations: Array<{
    coords: {
      latitude: number;
      longitude: number;
      altitude: number | null;
      accuracy: number | null;
      speed: number | null;
      heading: number | null;
    };
    timestamp: number;
  }>
): Promise<void> {
  const database = await getDatabase();
  if (!database || locations.length === 0) return;

  const values = locations.map((loc) => 
    `('${walkId}', ${loc.timestamp}, ${loc.coords.latitude}, ${loc.coords.longitude}, ${loc.coords.altitude ?? "NULL"}, ${loc.coords.accuracy ?? "NULL"}, ${loc.coords.speed ?? "NULL"}, ${loc.coords.heading ?? "NULL"})`
  ).join(", ");

  await database.execAsync(`
    INSERT INTO track_points (walk_id, timestamp, latitude, longitude, altitude, accuracy, speed, heading)
    VALUES ${values}
  `);
}

export async function getTrackPoints(walkId: string): Promise<TrackPoint[]> {
  const database = await getDatabase();
  if (!database) return [];

  const result = await database.getAllAsync<{
    id: number;
    walk_id: string;
    timestamp: number;
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
  }>(
    "SELECT * FROM track_points WHERE walk_id = ? ORDER BY timestamp ASC",
    [walkId]
  );

  return result.map((row: { id: number; walk_id: string; timestamp: number; latitude: number; longitude: number; altitude: number | null; accuracy: number | null; speed: number | null; heading: number | null }) => ({
    id: row.id,
    walkId: row.walk_id,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    altitude: row.altitude,
    accuracy: row.accuracy,
    speed: row.speed,
    heading: row.heading,
  }));
}

export async function clearTrackPoints(walkId: string): Promise<void> {
  const database = await getDatabase();
  if (!database) return;

  await database.execAsync(`DELETE FROM track_points WHERE walk_id = '${walkId}'`);
}

export async function setActiveWalk(walkId: string, startTime: number): Promise<void> {
  const database = await getDatabase();
  if (!database) return;

  await database.execAsync(`
    INSERT OR REPLACE INTO active_walk (id, walk_id, start_time, paused_time, is_paused)
    VALUES (1, '${walkId}', ${startTime}, 0, 0)
  `);
}

export async function getActiveWalk(): Promise<ActiveWalk | null> {
  const database = await getDatabase();
  if (!database) return null;

  const result = await database.getFirstAsync<{
    walk_id: string;
    start_time: number;
    paused_time: number;
    is_paused: number;
  }>("SELECT * FROM active_walk WHERE id = 1");

  if (!result) return null;

  return {
    walkId: result.walk_id,
    startTime: result.start_time,
    pausedTime: result.paused_time,
    isPaused: result.is_paused === 1,
  };
}

export async function updateActiveWalkPause(isPaused: boolean, pausedTime: number): Promise<void> {
  const database = await getDatabase();
  if (!database) return;

  await database.execAsync(`
    UPDATE active_walk SET is_paused = ${isPaused ? 1 : 0}, paused_time = ${pausedTime} WHERE id = 1
  `);
}

export async function clearActiveWalk(): Promise<void> {
  const database = await getDatabase();
  if (!database) return;

  await database.execAsync("DELETE FROM active_walk WHERE id = 1");
}

export async function getLatestTrackPoint(walkId: string): Promise<TrackPoint | null> {
  const database = await getDatabase();
  if (!database) return null;

  const result = await database.getFirstAsync<{
    id: number;
    walk_id: string;
    timestamp: number;
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
  }>(
    "SELECT * FROM track_points WHERE walk_id = ? ORDER BY timestamp DESC LIMIT 1",
    [walkId]
  );

  if (!result) return null;

  return {
    id: result.id,
    walkId: result.walk_id,
    timestamp: result.timestamp,
    latitude: result.latitude,
    longitude: result.longitude,
    altitude: result.altitude,
    accuracy: result.accuracy,
    speed: result.speed,
    heading: result.heading,
  };
}

export async function getTrackPointCount(walkId: string): Promise<number> {
  const database = await getDatabase();
  if (!database) return 0;

  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM track_points WHERE walk_id = ?",
    [walkId]
  );

  return result?.count ?? 0;
}
