export const CHART_EDGE_SPACING = 4;

// gifted-charts scrolls overflowing bars instead of shrinking them, which hid the last groups.
export function fitBarWidth(
  plotWidth: number,
  groups: number,
  innerGap: number,
  groupGap: number,
  maxBarWidth: number,
) {
  const gaps = groups * (innerGap + groupGap) + CHART_EDGE_SPACING * 3;
  return Math.max(2, Math.min(maxBarWidth, (plotWidth - gaps) / (groups * 2)));
}

export function formatKmAxisLabel(value: string) {
  const km = parseFloat(value);
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return Number.isInteger(km) ? `${km}` : km.toFixed(1);
}

// Full labels get cut to "L…" under narrow bar pairs; fall back to short ones there.
export function fitLabels(
  barWidth: number,
  innerGap: number,
  full: string[],
  short: string[],
) {
  const longest = Math.max(...full.map((label) => label.length));
  return barWidth * 2 + innerGap * 2 >= longest * 7 ? full : short;
}
