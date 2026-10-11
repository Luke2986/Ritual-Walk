import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, PersonColors } from "@/constants/theme";
import { formatDistance } from "@/lib/formatDistance";
import { shortName } from "@/lib/shortName";
import { useAppWidth } from "@/hooks/useAppWidth";
import {
  CHART_EDGE_SPACING,
  fitBars,
  fitLabels,
  formatKmAxisLabel,
} from "@/lib/chartLayout";
import type { DailyStats, StatsRange } from "@/lib/statsAggregation";

const midnightIndigo = "#1A1458";
const SEGMENT_GAP = 2;
const TOP_RADIUS = 6;

const PERIODS: Record<
  StatsRange,
  {
    labels: string[];
    shortLabels: string[];
    period: string;
    maxBarWidth: number;
    minGap: number;
    yAxisWidth: number;
    xLabelSize: number;
  }
> = {
  week: {
    labels: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
    shortLabels: ["L", "M", "M", "G", "V", "S", "D"],
    period: "questa settimana",
    maxBarWidth: 26,
    minGap: 8,
    yAxisWidth: 40,
    xLabelSize: 11,
  },
  month: {
    labels: ["Sett 1", "Sett 2", "Sett 3", "Sett 4"],
    shortLabels: ["S1", "S2", "S3", "S4"],
    period: "questo mese",
    maxBarWidth: 40,
    minGap: 16,
    yAxisWidth: 40,
    xLabelSize: 10,
  },
  year: {
    labels: [
      "Gen",
      "Feb",
      "Mar",
      "Apr",
      "Mag",
      "Giu",
      "Lug",
      "Ago",
      "Set",
      "Ott",
      "Nov",
      "Dic",
    ],
    shortLabels: ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"],
    period: "quest'anno",
    maxBarWidth: 16,
    minGap: 4,
    yAxisWidth: 35,
    xLabelSize: 8,
  },
};

interface TogetherBarChartProps {
  data: DailyStats;
  range: StatsRange;
  partnerName: string;
}

// One bar per day, week or month: what you walked together, split by color into each
// person's part. Stacked rather than side by side, so it reads as a shared total, not a race.
export function TogetherBarChart({
  data,
  range,
  partnerName,
}: TogetherBarChartProps) {
  const config = PERIODS[range];
  const totals = config.labels.map(
    (_, index) => (data.ioKm[index] || 0) + (data.partnerKm[index] || 0),
  );
  const totalTogether = totals.reduce((sum, km) => sum + km, 0);

  const chartWidth = useAppWidth() - Spacing.lg * 4;
  const plotWidth = chartWidth - (config.yAxisWidth + 10);
  const { barWidth, spacing } = fitBars(
    plotWidth,
    config.labels.length,
    config.minGap,
    config.maxBarWidth,
  );
  const labels = fitLabels(
    barWidth + spacing,
    config.labels,
    config.shortLabels,
  );

  const stackData = labels.map((label, index) => {
    const me = data.ioKm[index] || 0;
    const partner = data.partnerKm[index] || 0;
    const segments = [
      { value: me, color: PersonColors.me },
      { value: partner, color: PersonColors.partner },
    ].filter((segment) => segment.value > 0);
    return {
      label,
      labelWidth: barWidth + spacing,
      spacing,
      // Only the top segment gets rounded corners; a thin gap separates the two people.
      stacks:
        segments.length > 0
          ? segments.map((segment, i) => ({
              ...segment,
              marginBottom: i > 0 ? SEGMENT_GAP : 0,
              borderTopLeftRadius: i === segments.length - 1 ? TOP_RADIUS : 0,
              borderTopRightRadius: i === segments.length - 1 ? TOP_RADIUS : 0,
            }))
          : [{ value: 0, color: "transparent" }],
    };
  });

  const yAxisMax = Math.ceil(Math.max(...totals, 1) * 1.2);

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <ThemedText type="body" style={styles.summaryText}>
          Insieme avete percorso
        </ThemedText>
        <ThemedText type="h2" style={styles.summaryValue}>
          {formatDistance(totalTogether)}
        </ThemedText>
        <ThemedText type="body" style={styles.summaryText}>
          {config.period}
        </ThemedText>
      </View>

      <View style={styles.chartContainer}>
        <BarChart
          // Bars only animate on mount, so remount when the numbers change.
          key={`${range}:${[...data.ioKm, ...data.partnerKm].join()}`}
          stackData={stackData}
          barWidth={barWidth}
          spacing={spacing}
          initialSpacing={CHART_EDGE_SPACING}
          endSpacing={CHART_EDGE_SPACING}
          disableScroll
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={[
            styles.axisText,
            { fontSize: config.xLabelSize },
          ]}
          noOfSections={4}
          maxValue={yAxisMax}
          showFractionalValues
          roundToDigits={2}
          formatYLabel={formatKmAxisLabel}
          yAxisLabelWidth={config.yAxisWidth}
          width={plotWidth}
          height={180}
          isAnimated
          animationDuration={600}
        />
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: PersonColors.me }]}
          />
          <ThemedText type="small" style={styles.legendText}>
            Io
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: PersonColors.partner },
            ]}
          />
          <ThemedText type="small" style={styles.legendText}>
            {shortName(partnerName)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: midnightIndigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  summaryText: {
    color: midnightIndigo,
    opacity: 0.7,
  },
  summaryValue: {
    color: midnightIndigo,
    marginVertical: Spacing.xs,
  },
  chartContainer: {
    marginVertical: Spacing.md,
    alignItems: "center",
  },
  axisText: {
    color: midnightIndigo,
    fontSize: 10,
    opacity: 0.6,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: midnightIndigo,
  },
});
