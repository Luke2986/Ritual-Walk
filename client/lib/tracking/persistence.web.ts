// Web has no GPS tracking or local walk storage; expo-sqlite would also need a wasm-enabled bundler.
import type { RawFix } from "./geo";
import type { ActiveSession, TrackPoint } from "./persistence";

export type { ActiveSession, TrackPoint } from "./persistence";

export async function getActiveSession(): Promise<ActiveSession | null> {
  return null;
}

export async function createSession(
  _walkId: string,
  _startedAt: number,
): Promise<void> {}

export async function markPaused(_pausedAt: number, _steps: number) {}

export async function markResumed(_resumedAt: number) {}

export async function markEnded(_endedAt: number, _steps: number) {}

export async function saveSteps(_steps: number) {}

export async function clearSession(): Promise<void> {}

export async function getTrackPoints(
  _walkId: string,
  _afterId = 0,
): Promise<TrackPoint[]> {
  return [];
}

export async function persistFixes(_fixes: RawFix[]): Promise<void> {}
