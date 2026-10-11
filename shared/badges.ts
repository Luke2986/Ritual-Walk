import { daysBetween } from "./dates";

// Badges belong to the ritual (the couple), not to one person: both see the same ones.
export type BadgeGroup = "insieme" | "costanza" | "distanza" | "camminate";

export type BadgeKey =
  | "together-first"
  | "together-week"
  | "together-month"
  | "streak-3"
  | "streak-7"
  | "streak-30"
  | "km-5"
  | "km-10"
  | "km-42"
  | "km-100"
  | "walks-1"
  | "walks-10";

type Metric =
  | "togetherDays"
  | "weekTogether"
  | "goodWeekRun"
  | "streak"
  | "totalKm"
  | "walkCount";

export interface BadgeDefinition {
  key: BadgeKey;
  group: BadgeGroup;
  name: string;
  description: string;
  icon: string;
  metric: Metric;
  target: number;
}

export const GOOD_WEEK_TOGETHER_DAYS = 3;

export const BADGE_GROUPS: { group: BadgeGroup; title: string }[] = [
  { group: "insieme", title: "Insieme" },
  { group: "costanza", title: "Costanza" },
  { group: "distanza", title: "Distanza" },
  { group: "camminate", title: "Camminate" },
];

export const BADGES: BadgeDefinition[] = [
  {
    key: "together-first",
    group: "insieme",
    name: "Primo giorno insieme",
    description: "Camminate entrambi nello stesso giorno",
    icon: "users",
    metric: "togetherDays",
    target: 1,
  },
  {
    key: "together-week",
    group: "insieme",
    name: "Settimana insieme",
    description: `Camminate entrambi in ${GOOD_WEEK_TOGETHER_DAYS} giorni della stessa settimana`,
    icon: "calendar",
    metric: "weekTogether",
    target: GOOD_WEEK_TOGETHER_DAYS,
  },
  {
    key: "together-month",
    group: "insieme",
    name: "Mese insieme",
    description: `4 settimane di fila con almeno ${GOOD_WEEK_TOGETHER_DAYS} giorni insieme`,
    icon: "repeat",
    metric: "goodWeekRun",
    target: 4,
  },
  {
    key: "streak-3",
    group: "costanza",
    name: "3 giorni",
    description: "Mantenete uno streak di 3 giorni",
    icon: "zap",
    metric: "streak",
    target: 3,
  },
  {
    key: "streak-7",
    group: "costanza",
    name: "7 giorni",
    description: "Mantenete uno streak di 7 giorni",
    icon: "star",
    metric: "streak",
    target: 7,
  },
  {
    key: "streak-30",
    group: "costanza",
    name: "30 giorni",
    description: "Mantenete uno streak di 30 giorni",
    icon: "sun",
    metric: "streak",
    target: 30,
  },
  {
    key: "km-5",
    group: "distanza",
    name: "5 km",
    description: "Raggiungete 5 km in totale",
    icon: "map-pin",
    metric: "totalKm",
    target: 5,
  },
  {
    key: "km-10",
    group: "distanza",
    name: "10 km",
    description: "Raggiungete 10 km in totale",
    icon: "navigation",
    metric: "totalKm",
    target: 10,
  },
  {
    key: "km-42",
    group: "distanza",
    name: "Maratona",
    description: "Raggiungete 42 km in totale",
    icon: "award",
    metric: "totalKm",
    target: 42,
  },
  {
    key: "km-100",
    group: "distanza",
    name: "100 km",
    description: "Raggiungete 100 km in totale",
    icon: "target",
    metric: "totalKm",
    target: 100,
  },
  {
    key: "walks-1",
    group: "camminate",
    name: "Primo passo",
    description: "Completate la prima camminata",
    icon: "play",
    metric: "walkCount",
    target: 1,
  },
  {
    key: "walks-10",
    group: "camminate",
    name: "10 camminate",
    description: "Completate 10 camminate in totale",
    icon: "trending-up",
    metric: "walkCount",
    target: 10,
  },
];

export function getBadge(key: string): BadgeDefinition | undefined {
  return BADGES.find((badge) => badge.key === key);
}

export interface BadgeWalk {
  userId: string;
  distanceKm: number;
  localDate: string;
  endedAt: Date;
}

// All-time records decide which badges are earned.
interface Records {
  togetherDays: number;
  weekTogether: number;
  goodWeekRun: number;
  streak: number;
  totalKm: number;
  walkCount: number;
}

// What the badge screen shows as progress towards the badges still locked.
export interface BadgeProgress {
  totalKm: number;
  walkCount: number;
  togetherDays: number;
  currentStreak: number;
  thisWeekTogether: number;
  currentGoodWeekRun: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function mondayOf(dateKey: string): string {
  const time = Date.parse(`${dateKey}T00:00:00Z`);
  const weekday = (new Date(time).getUTCDay() + 6) % 7;
  return new Date(time - weekday * DAY_MS).toISOString().slice(0, 10);
}

// Longest run of keys that are `step` days apart, and the run ending at `endKey`.
function runs(sortedKeys: string[], step: number, endKey?: string) {
  let longest = 0;
  let current = 0;
  let endingAt = 0;
  sortedKeys.forEach((key, index) => {
    current =
      index > 0 && daysBetween(sortedKeys[index - 1], key) === step
        ? current + 1
        : 1;
    longest = Math.max(longest, current);
    if (key === endKey) endingAt = current;
  });
  return { longest, endingAt };
}

class RitualHistory {
  private walkersByDay = new Map<string, Set<string>>();
  private togetherByWeek = new Map<string, number>();
  private days: string[] = [];
  private goodWeeks: string[] = [];
  readonly records: Records = {
    togetherDays: 0,
    weekTogether: 0,
    goodWeekRun: 0,
    streak: 0,
    totalKm: 0,
    walkCount: 0,
  };

  add(walk: BadgeWalk) {
    const r = this.records;
    r.totalKm += walk.distanceKm;
    r.walkCount += 1;

    let walkers = this.walkersByDay.get(walk.localDate);
    if (!walkers) {
      walkers = new Set();
      this.walkersByDay.set(walk.localDate, walkers);
      this.days = [...this.days, walk.localDate].sort();
      r.streak = Math.max(r.streak, runs(this.days, 1).longest);
    }
    if (walkers.has(walk.userId)) return;
    walkers.add(walk.userId);
    if (walkers.size !== 2) return;

    // The second person walked on this day: it becomes a day together.
    r.togetherDays += 1;
    const week = mondayOf(walk.localDate);
    const inWeek = (this.togetherByWeek.get(week) ?? 0) + 1;
    this.togetherByWeek.set(week, inWeek);
    r.weekTogether = Math.max(r.weekTogether, inWeek);
    if (inWeek === GOOD_WEEK_TOGETHER_DAYS) {
      this.goodWeeks = [...this.goodWeeks, week].sort();
      r.goodWeekRun = Math.max(r.goodWeekRun, runs(this.goodWeeks, 7).longest);
    }
  }

  progress(today: string): BadgeProgress {
    const lastDay = this.days[this.days.length - 1];
    const streakAlive =
      lastDay !== undefined && daysBetween(lastDay, today) <= 1;

    // A week in progress doesn't break the run: count up to last week if this one isn't done.
    const thisWeek = mondayOf(today);
    const lastWeek = new Date(Date.parse(`${thisWeek}T00:00:00Z`) - 7 * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const weekRuns = runs(this.goodWeeks, 7, thisWeek);
    const currentGoodWeekRun =
      weekRuns.endingAt || runs(this.goodWeeks, 7, lastWeek).endingAt;

    return {
      totalKm: this.records.totalKm,
      walkCount: this.records.walkCount,
      togetherDays: this.records.togetherDays,
      currentStreak: streakAlive ? runs(this.days, 1, lastDay).endingAt : 0,
      thisWeekTogether: this.togetherByWeek.get(thisWeek) ?? 0,
      currentGoodWeekRun,
    };
  }
}

function sortByEnd(walks: BadgeWalk[]): BadgeWalk[] {
  return [...walks].sort((a, b) => a.endedAt.getTime() - b.endedAt.getTime());
}

// Replays the walks in order and returns when each badge was first reached.
export function earnedBadges(walks: BadgeWalk[]): Map<BadgeKey, Date> {
  const history = new RitualHistory();
  const earned = new Map<BadgeKey, Date>();
  for (const walk of sortByEnd(walks)) {
    history.add(walk);
    for (const badge of BADGES) {
      if (
        !earned.has(badge.key) &&
        history.records[badge.metric] >= badge.target - 1e-9
      ) {
        earned.set(badge.key, walk.endedAt);
      }
    }
  }
  return earned;
}

export function badgeProgress(
  walks: BadgeWalk[],
  today: string,
): BadgeProgress {
  const history = new RitualHistory();
  for (const walk of sortByEnd(walks)) history.add(walk);
  return history.progress(today);
}

export const formatKm = (km: number) =>
  km.toLocaleString("it-IT", { maximumFractionDigits: 1 });

// Progress towards a locked badge, e.g. "7,2 di 10 km".
export function progressOf(
  badge: BadgeDefinition,
  progress: BadgeProgress,
): { value: number; label: string } {
  const t = badge.target;
  switch (badge.metric) {
    case "totalKm":
      return {
        value: progress.totalKm,
        label: `${formatKm(Math.min(progress.totalKm, t))} di ${t} km`,
      };
    case "walkCount":
      return {
        value: progress.walkCount,
        label: `${Math.min(progress.walkCount, t)} di ${t} ${t === 1 ? "camminata" : "camminate"}`,
      };
    case "streak":
      return {
        value: progress.currentStreak,
        label: `Streak attuale: ${Math.min(progress.currentStreak, t)} di ${t} giorni`,
      };
    case "togetherDays":
      return {
        value: progress.togetherDays,
        label: "Ancora nessun giorno insieme",
      };
    case "weekTogether":
      return {
        value: progress.thisWeekTogether,
        label: `Questa settimana: ${Math.min(progress.thisWeekTogether, t)} di ${t} giorni insieme`,
      };
    case "goodWeekRun":
      return {
        value: progress.currentGoodWeekRun,
        label: `Settimane di fila: ${Math.min(progress.currentGoodWeekRun, t)} di ${t}`,
      };
  }
}
