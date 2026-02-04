import React from "react";
import { View, StyleSheet, AccessibilityInfo } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows, Colors } from "@/constants/theme";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  color: string;
  accessibilityLabel: string;
}

function KpiCard({ label, value, unit, color, accessibilityLabel }: KpiCardProps) {
  const { theme } = useTheme();
  
  return (
    <View 
      style={[styles.card, { backgroundColor: theme.cardBackground }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View style={styles.valueRow}>
        <ThemedText style={[styles.value, { color }]}>
          {value}
        </ThemedText>
        {unit ? (
          <ThemedText style={[styles.unit, { color: theme.textSecondary }]}>
            {unit}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

interface WalkKpiRowProps {
  steps: number;
  distanceKm: number;
  durationFormatted: string;
  durationAccessible: string;
}

export function WalkKpiRow({ 
  steps, 
  distanceKm, 
  durationFormatted,
  durationAccessible 
}: WalkKpiRowProps) {
  const { theme } = useTheme();
  
  const formatDistance = (km: number): { value: string; unit: string } => {
    if (km < 1) {
      return { value: Math.round(km * 1000).toString(), unit: "m" };
    }
    return { value: km.toFixed(2), unit: "km" };
  };

  const distance = formatDistance(distanceKm);
  
  return (
    <View style={styles.container}>
      <KpiCard
        label="Passi"
        value={steps.toLocaleString("it-IT")}
        color={Colors.light.accentCyan}
        accessibilityLabel={`Passi: ${steps.toLocaleString("it-IT")}`}
      />
      <KpiCard
        label="Distanza"
        value={distance.value}
        unit={distance.unit}
        color={Colors.light.secondary}
        accessibilityLabel={`Distanza stimata: ${distance.value} ${distance.unit === "m" ? "metri" : "chilometri"}`}
      />
      <KpiCard
        label="Tempo"
        value={durationFormatted}
        color={Colors.light.accentMagenta}
        accessibilityLabel={`Tempo: ${durationAccessible}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    ...Shadows.card,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  value: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  unit: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
});
