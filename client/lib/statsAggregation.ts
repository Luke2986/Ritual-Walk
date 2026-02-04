import { ActivityByDate } from "@/components/ProgressCalendar";

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

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getYearStartEnd(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export function getDateRange(range: "week" | "month" | "year"): { start: Date; end: Date } {
  switch (range) {
    case "week":
      return getWeekStartEnd();
    case "month":
      return getMonthStartEnd();
    case "year":
      return getYearStartEnd();
  }
}

export function aggregateWeeklyStats(
  walks: WalkData[],
  userId: string | null,
  partnerId: string | null
): DailyStats {
  const { start } = getWeekStartEnd();
  const ioKm: number[] = [0, 0, 0, 0, 0, 0, 0];
  const partnerKm: number[] = [0, 0, 0, 0, 0, 0, 0];

  walks.forEach((walk) => {
    const walkDate = new Date(walk.startedAt);
    const dayIndex = Math.floor((walkDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayIndex >= 0 && dayIndex < 7) {
      if (walk.userId === userId) {
        ioKm[dayIndex] += walk.distanceKm;
      } else if (walk.userId === partnerId) {
        partnerKm[dayIndex] += walk.distanceKm;
      }
    }
  });

  return { ioKm, partnerKm };
}

export function aggregateMonthlyStats(
  walks: WalkData[],
  userId: string | null,
  partnerId: string | null
): DailyStats {
  const { start } = getMonthStartEnd();
  const ioKm: number[] = [0, 0, 0, 0];
  const partnerKm: number[] = [0, 0, 0, 0];

  walks.forEach((walk) => {
    const walkDate = new Date(walk.startedAt);
    const dayOfMonth = walkDate.getDate();
    const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
    
    if (walk.userId === userId) {
      ioKm[weekIndex] += walk.distanceKm;
    } else if (walk.userId === partnerId) {
      partnerKm[weekIndex] += walk.distanceKm;
    }
  });

  return { ioKm, partnerKm };
}

export function aggregateYearlyStats(
  walks: WalkData[],
  userId: string | null,
  partnerId: string | null
): DailyStats {
  const ioKm: number[] = Array(12).fill(0);
  const partnerKm: number[] = Array(12).fill(0);

  walks.forEach((walk) => {
    const walkDate = new Date(walk.startedAt);
    const monthIndex = walkDate.getMonth();
    
    if (walk.userId === userId) {
      ioKm[monthIndex] += walk.distanceKm;
    } else if (walk.userId === partnerId) {
      partnerKm[monthIndex] += walk.distanceKm;
    }
  });

  return { ioKm, partnerKm };
}

export function buildActivityByDate(
  walks: WalkData[],
  userId: string | null,
  partnerId: string | null
): ActivityByDate {
  const activityMap: ActivityByDate = {};

  walks.forEach((walk) => {
    const dateKey = formatDateKey(new Date(walk.startedAt));
    
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

export function getTotalDistance(stats: DailyStats): { ioTotal: number; partnerTotal: number; together: number } {
  const ioTotal = stats.ioKm.reduce((sum, km) => sum + km, 0);
  const partnerTotal = stats.partnerKm.reduce((sum, km) => sum + km, 0);
  return {
    ioTotal,
    partnerTotal,
    together: ioTotal + partnerTotal,
  };
}
