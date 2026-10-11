const DAY_MS = 24 * 60 * 60 * 1000;

// Local calendar day as YYYY-MM-DD (not UTC, unlike toISOString).
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function daysBetween(fromDateKey: string, toDateKey: string): number {
  return Math.round(
    (Date.parse(`${toDateKey}T00:00:00Z`) -
      Date.parse(`${fromDateKey}T00:00:00Z`)) /
      DAY_MS,
  );
}
