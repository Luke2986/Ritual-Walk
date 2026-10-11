import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDistance } from "@/lib/formatDistance";
import { useAppWidth } from "@/hooks/useAppWidth";
import {
  CHART_EDGE_SPACING,
  fitBarWidth,
  fitLabels,
  formatKmAxisLabel,
} from "@/lib/chartLayout";

const electricCyan = "#00E5FF";
const lavenderPop = "#B88BFF";
const midnightIndigo = "#1A1458";

interface MonthlyData {
  ioKm: number[];
  partnerKm: number[];
}

interface MonthlyDualBarChartProps {
  data: MonthlyData;
}

const weekLabels = ["Sett 1", "Sett 2", "Sett 3", "Sett 4"];
const weekShortLabels = ["S1", "S2", "S3", "S4"];

const INNER_GAP = 4;
const GROUP_GAP = 24;

export function MonthlyDualBarChart({ data }: MonthlyDualBarChartProps) {
  const totalIo = data.ioKm.reduce((sum, km) => sum + km, 0);
  const totalPartner = data.partnerKm.reduce((sum, km) => sum + km, 0);
  const totalTogether = totalIo + totalPartner;

  const chartWidth = useAppWidth() - Spacing.lg * 4;
  const plotWidth = chartWidth - 50;
  const barWidth = fitBarWidth(
    plotWidth,
    weekLabels.length,
    INNER_GAP,
    GROUP_GAP,
    24,
  );

  const labels = fitLabels(barWidth, INNER_GAP, weekLabels, weekShortLabels);

  const chartData = labels.flatMap((label, index) => [
    {
      value: data.ioKm[index] || 0,
      frontColor: electricCyan,
      spacing: INNER_GAP,
      label,
      labelWidth: barWidth * 2 + INNER_GAP,
    },
    {
      value: data.partnerKm[index] || 0,
      frontColor: lavenderPop,
      spacing: GROUP_GAP,
    },
  ]);

  const maxValue = Math.max(...data.ioKm, ...data.partnerKm, 1);
  const yAxisMax = Math.ceil(maxValue * 1.2);

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
          questo mese
        </ThemedText>
      </View>

      <View style={styles.chartContainer}>
        <BarChart
          // Bars only animate on mount, so remount when the numbers change.
          key={[...data.ioKm, ...data.partnerKm].join()}
          data={chartData}
          barWidth={barWidth}
          spacing={INNER_GAP}
          initialSpacing={CHART_EDGE_SPACING}
          endSpacing={CHART_EDGE_SPACING}
          disableScroll
          roundedTop
          roundedBottom={false}
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={styles.yAxisText}
          xAxisLabelTextStyle={styles.xAxisText}
          noOfSections={4}
          maxValue={yAxisMax}
          showFractionalValues
          roundToDigits={2}
          formatYLabel={formatKmAxisLabel}
          yAxisLabelWidth={40}
          width={plotWidth}
          height={180}
          isAnimated
          animationDuration={600}
          barBorderTopLeftRadius={6}
          barBorderTopRightRadius={6}
        />
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: electricCyan }]} />
          <ThemedText type="small" style={styles.legendText}>
            Io ({formatDistance(totalIo)})
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: lavenderPop }]} />
          <ThemedText type="small" style={styles.legendText}>
            Partner ({formatDistance(totalPartner)})
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
  yAxisText: {
    color: midnightIndigo,
    fontSize: 11,
    opacity: 0.6,
  },
  xAxisText: {
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
    ...Platform.select({
      ios: {
        shadowColor: electricCyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
    }),
  },
  legendText: {
    color: midnightIndigo,
  },
});
