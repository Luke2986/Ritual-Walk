const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(
  fromLocalDate: string,
  toLocalDate: string,
): number {
  return Math.round(
    (Date.parse(`${toLocalDate}T00:00:00Z`) -
      Date.parse(`${fromLocalDate}T00:00:00Z`)) /
      DAY_MS,
  );
}

// Couples created before last_walk_local_date existed only have a UTC timestamp.
export function lastWalkLocalDateOf(couple: {
  lastWalkLocalDate: string | null;
  lastWalkDate: Date | null;
}): string | null {
  return (
    couple.lastWalkLocalDate ??
    couple.lastWalkDate?.toISOString().slice(0, 10) ??
    null
  );
}

export function applyWalkToStreak(
  state: { currentStreak: number; lastLocalDate: string | null },
  walkLocalDate: string,
): { currentStreak: number; lastLocalDate: string } {
  if (!state.lastLocalDate) {
    return { currentStreak: 1, lastLocalDate: walkLocalDate };
  }

  const diff = daysBetween(state.lastLocalDate, walkLocalDate);
  if (diff <= 0) {
    return {
      currentStreak: Math.max(state.currentStreak, 1),
      lastLocalDate: state.lastLocalDate,
    };
  }
  if (diff === 1) {
    return {
      currentStreak: state.currentStreak + 1,
      lastLocalDate: walkLocalDate,
    };
  }
  return { currentStreak: 1, lastLocalDate: walkLocalDate };
}
