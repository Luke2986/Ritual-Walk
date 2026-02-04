import React from "react";
import { StyleSheet, View, Platform, Dimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDistance } from "@/lib/formatDistance";

const electricCyan = "#00E5FF";
const lavenderPop = "#B88BFF";
const midnightIndigo = "#1A1458";

interface YearlyData {
  ioKm: number[];
  partnerKm: number[];
}

interface YearlyDualBarChartProps {
  data: YearlyData;
}

const monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export function YearlyDualBarChart({ data }: YearlyDualBarChartProps) {
  const totalIo = data.ioKm.reduce((sum, km) => sum + km, 0);
  const totalPartner = data.partnerKm.reduce((sum, km) => sum + km, 0);
  const totalTogether = totalIo + totalPartner;

  const chartData = monthLabels.flatMap((label, index) => [
    {
      value: data.ioKm[index] || 0,
      frontColor: electricCyan,
      spacing: 2,
    },
    {
      value: data.partnerKm[index] || 0,
      label: label,
      frontColor: lavenderPop,
      spacing: 8,
    },
  ]);

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - Spacing.lg * 4;
  const barWidth = Math.min(10, (chartWidth - 60) / 24);

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
          quest'anno
        </ThemedText>
      </View>

      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          barWidth={barWidth}
          spacing={2}
          roundedTop
          roundedBottom={false}
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={styles.yAxisText}
          xAxisLabelTextStyle={styles.xAxisText}
          noOfSections={4}
          maxValue={yAxisMax}
          formatYLabel={(val) => {
            const num = parseFloat(val);
            if (num < 1) {
              return `${Math.round(num * 1000)}m`;
            }
            return `${num.toFixed(0)}`;
          }}
          yAxisLabelWidth={35}
          width={chartWidth - 45}
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
    fontSize: 10,
    opacity: 0.6,
  },
  xAxisText: {
    color: midnightIndigo,
    fontSize: 8,
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
