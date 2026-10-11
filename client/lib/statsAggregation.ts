import { apiRequest } from "@/lib/query-client";
import { daysBetween, toLocalDateKey } from "@shared/dates";

// Who walked on each calendar day (YYYY-MM-DD).
export type ActivityByDate = Record<string, { me: boolean; partner: boolean }>;

export interface WalkData {
  id: string;
  userId: string;
  distanceKm: number;
  durationSeconds: number;
  startedAt: string;
}

export interface StatsResponse {
  walks: WalkData[];
  userId: string | null;
  partnerId: string | null;
}

export interface DailyStats {
  ioKm: number[];
  partnerKm: number[];
}

export type StatsRange = "week" | "month" | "year";

function getWeekStartEnd(): { start: Date; end: Date } {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function getMonthStartEnd(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

function getYearStartEnd(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export function getDateRange(range: StatsRange): {
  start: Date;
  end: Date;
} {
  switch (range) {
    case "week":
      return getWeekStartEnd();
    case "month":
      return getMonthStartEnd();
    case "year":
      return getYearStartEnd();
  }
}

export async function fetchStats(range: StatsRange): Promise<StatsResponse> {
  const { start, end } = getDateRange(range);
  const query =
    `startDate=${encodeURIComponent(start.toISOString())}` +
    `&endDate=${encodeURIComponent(end.toISOString())}`;
  const res = await apiRequest("GET", `/api/walks/stats?${query}`);
  return res.json();
}

export function statsQueryKey(range: StatsRange) {
  return ["/api/walks/stats", range, toLocalDateKey(new Date())];
}

function addKm(
  stats: DailyStats,
  index: number,
  walk: WalkData,
  userId: string | null,
  partnerId: string | null,
) {
  if (index < 0 || index >= stats.ioKm.length) return;
  if (walk.userId === userId) {
    stats.ioKm[index] += walk.distanceKm;
  } else if (walk.userId === partnerId) {
    stats.partnerKm[index] += walk.distanceKm;
  }
}

export function aggregateWeeklyStats(
  walks: WalkData[],
  userId: string | null,
  partnerId: string | null,
): DailyStats {
  const mondayKey = toLocalDateKey(getWeekStartEnd().start);
  const stats: DailyStats = {
    ioKm: Array(7).fill(0),
    partnerKm: Array(7).fill(0),
  };

  walks.forEach((walk) => {
    const dayIndex = daysBetween(
      mondayKey,
      toLocalDateKey(new Date(walk.startedAt)),
    );
    addKm(stats, dayIndex, walk, userId, partnerId);
  });

  return stats;
}

export function aggregateMonthlyStats(
  walks: WalkData[],
  userId: string | null,
  partnerId: string | null,
): DailyStats {
  const today = new Date();
  const stats: DailyStats = {
    ioKm: Array(4).fill(0),
    partnerKm: Array(4).fill(0),
  };

  walks.forEach((walk) => {
    const walkDate = new Date(walk.startedAt);
    if (
      walkDate.getFullYear() !== today.getFullYear() ||
      walkDate.getMonth() !== today.getMonth()
    ) {
      return;
    }
    const weekIndex = Math.min(Math.floor((walkDate.getDate() - 1) / 7), 3);
    addKm(stats, weekIndex, walk, userId, partnerId);
  });

  return stats;
}

export function aggregateYearlyStats(
  walks: WalkData[],
  userId: string | null,
  partnerId: string | null,
): DailyStats {
  const year = new Date().getFullYear();
  const stats: DailyStats = {
    ioKm: Array(12).fill(0),
    partnerKm: Array(12).fill(0),
  };

  walks.forEach((walk) => {
    const walkDate = new Date(walk.startedAt);
    if (walkDate.getFullYear() !== year) return;
    addKm(stats, walkDate.getMonth(), walk, userId, partnerId);
  });

  return stats;
}

export function buildActivityByDate(
  walks: WalkData[],
  userId: string | null,
  partnerId: string | null,
): ActivityByDate {
  const activityMap: ActivityByDate = {};

  walks.forEach((walk) => {
    const dateKey = toLocalDateKey(new Date(walk.startedAt));

    if (!activityMap[dateKey]) {
      activityMap[dateKey] = { me: false, partner: false };
    }

    if (walk.userId === userId) {
      activityMap[dateKey].me = true;
    } else if (walk.userId === partnerId) {
      activityMap[dateKey].partner = true;
    }
  });

  return activityMap;
}

// The stored streak only changes when a walk is saved, so a missed day must be applied on read.
export function getEffectiveStreak(couple: {
  currentStreak: number;
  lastWalkLocalDate: string | null;
}): number {
  if (!couple.lastWalkLocalDate) return 0;
  const gap = daysBetween(couple.lastWalkLocalDate, toLocalDateKey(new Date()));
  return gap <= 1 ? couple.currentStreak : 0;
}
