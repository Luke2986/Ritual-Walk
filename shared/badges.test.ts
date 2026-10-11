import { test } from "node:test";
import assert from "node:assert/strict";
import {
  badgeProgress,
  earnedBadges,
  getBadge,
  progressOf,
  type BadgeWalk,
} from "./badges";

const EMPTY = badgeProgress([], "2026-10-11");

// Walks end one hour apart, in the order they are listed.
function history(...walks: [user: string, date: string, km?: number][]) {
  let time = Date.parse("2026-09-01T00:00:00Z");
  return walks.map(
    ([userId, localDate, distanceKm = 3]): BadgeWalk => ({
      userId,
      localDate,
      distanceKm,
      endedAt: new Date((time += 3_600_000)),
    }),
  );
}

// Both people walk on Monday, Wednesday and Friday of the week starting `monday`.
function goodWeek(monday: string): [string, string, number][] {
  const start = Date.parse(`${monday}T00:00:00Z`);
  return [0, 2, 4].flatMap((offset) => {
    const day = new Date(start + offset * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return [
      ["a", day, 1],
      ["b", day, 1],
    ] as [string, string, number][];
  });
}

test("no walks, no badges", () => {
  assert.equal(earnedBadges([]).size, 0);
  assert.deepEqual(EMPTY, {
    totalKm: 0,
    walkCount: 0,
    togetherDays: 0,
    currentStreak: 0,
    thisWeekTogether: 0,
    currentGoodWeekRun: 0,
  });
});

test("badges get the date of the walk that reached them", () => {
  const walks = history(
    ["a", "2026-10-05"],
    ["a", "2026-10-06"],
    ["a", "2026-10-07"],
  );
  const earned = earnedBadges(walks);
  assert.equal(earned.get("walks-1"), walks[0].endedAt);
  assert.equal(earned.get("km-5"), walks[1].endedAt);
  assert.equal(earned.get("streak-3"), walks[2].endedAt);
  assert.ok(!earned.has("together-first"));
});

test("a day together needs both people, not two walks", () => {
  assert.ok(
    !earnedBadges(history(["a", "2026-10-05"], ["a", "2026-10-05"])).has(
      "together-first",
    ),
  );
  const walks = history(["a", "2026-10-05"], ["b", "2026-10-05"]);
  assert.equal(earnedBadges(walks).get("together-first"), walks[1].endedAt);
});

test("a week together needs three days in the same Monday-Sunday week", () => {
  const sameWeek = history(...goodWeek("2026-10-05"));
  assert.equal(
    earnedBadges(sameWeek).get("together-week"),
    sameWeek[sameWeek.length - 1].endedAt,
  );

  const acrossWeeks = history(
    ...(["2026-10-04", "2026-10-05", "2026-10-06"].flatMap((day) => [
      ["a", day],
      ["b", day],
    ]) as [string, string][]),
  );
  assert.ok(!earnedBadges(acrossWeeks).has("together-week"));
});

test("a month together needs four good weeks in a row", () => {
  const inARow = history(
    ...goodWeek("2026-09-07"),
    ...goodWeek("2026-09-14"),
    ...goodWeek("2026-09-21"),
    ...goodWeek("2026-09-28"),
  );
  assert.equal(
    earnedBadges(inARow).get("together-month"),
    inARow[inARow.length - 1].endedAt,
  );

  const withGap = history(
    ...goodWeek("2026-09-07"),
    ...goodWeek("2026-09-14"),
    ...goodWeek("2026-09-28"),
    ...goodWeek("2026-10-05"),
  );
  assert.ok(!earnedBadges(withGap).has("together-month"));
});

test("the streak uses the longest run of days, in any order", () => {
  const walks = history(
    ["a", "2026-10-10"],
    ["a", "2026-10-08"],
    ["a", "2026-10-09"],
  );
  assert.ok(earnedBadges(walks).has("streak-3"));
});

test("progress follows today's date", () => {
  const streak = history(
    ["a", "2026-10-08"],
    ["b", "2026-10-09"],
    ["a", "2026-10-10"],
  );
  assert.equal(badgeProgress(streak, "2026-10-11").currentStreak, 3);
  assert.equal(badgeProgress(streak, "2026-10-12").currentStreak, 0);

  // A week still in progress keeps the run of good weeks that ended last week.
  const weeks = history(...goodWeek("2026-09-28"), ...goodWeek("2026-10-05"));
  const tuesday = badgeProgress(weeks, "2026-10-13");
  assert.equal(tuesday.currentGoodWeekRun, 2);
  assert.equal(tuesday.thisWeekTogether, 0);
  assert.equal(
    badgeProgress(history(...goodWeek("2026-09-28")), "2026-10-13")
      .currentGoodWeekRun,
    0,
  );
});

test("progress labels", () => {
  const label = (key: string, progress: Partial<typeof EMPTY>) =>
    progressOf(getBadge(key)!, { ...EMPTY, ...progress }).label;
  assert.equal(label("km-10", { totalKm: 7.24 }), "7,2 di 10 km");
  assert.equal(label("walks-1", {}), "0 di 1 camminata");
  assert.equal(
    label("together-week", { thisWeekTogether: 2 }),
    "Questa settimana: 2 di 3 giorni insieme",
  );
  assert.equal(
    label("streak-7", { currentStreak: 2 }),
    "Streak attuale: 2 di 7 giorni",
  );
});
