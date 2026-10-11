import { formatDecimal } from "@/lib/formatDistance";

export const CHART_EDGE_SPACING = 4;

// gifted-charts scrolls overflowing bars instead of shrinking them, which hid the last ones.
// Bars get at most `maxBarWidth`; the spacing absorbs the rest so they fill the plot.
export function fitBars(
  plotWidth: number,
  bars: number,
  minGap: number,
  maxBarWidth: number,
) {
  const free = plotWidth - CHART_EDGE_SPACING * 3;
  const barWidth = Math.max(2, Math.min(maxBarWidth, free / bars - minGap));
  const spacing = Math.max(minGap, free / bars - barWidth);
  return { barWidth, spacing };
}

export function formatKmAxisLabel(value: string) {
  const km = parseFloat(value);
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return Number.isInteger(km) ? `${km}` : formatDecimal(km, 1);
}

// Full labels get cut to "L…" under narrow bars; fall back to short ones there.
export function fitLabels(slotWidth: number, full: string[], short: string[]) {
  const longest = Math.max(...full.map((label) => label.length));
  return slotWidth >= longest * 7 ? full : short;
}
