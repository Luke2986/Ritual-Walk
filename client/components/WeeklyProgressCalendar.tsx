import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ActivityByDate } from "@/components/ProgressCalendar";

const electricCyan = "#00E5FF";
const lavenderPop = "#B88BFF";
const togetherGlow = "#FFE66D";
const midnightIndigo = "#1A1458";
const secondaryText = "#3B2F8A";

const dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

interface WeeklyProgressCalendarProps {
  activityData: ActivityByDate;
  onPress?: () => void;
}

function getWeekDates(): { date: string; day: number; isToday: boolean }[] {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

  const dates: { date: string; day: number; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dates.push({
      date: dateStr,
      day: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
    });
  }
  return dates;
}

export function WeeklyProgressCalendar({ activityData, onPress }: WeeklyProgressCalendarProps) {
  const weekDates = getWeekDates();

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="body" style={styles.headerTitle}>
          Calendario progressi
        </ThemedText>
        <View style={styles.ctaContainer}>
          <ThemedText type="small" style={styles.ctaText}>
            Vedi storico
          </ThemedText>
          <Feather name="chevron-right" size={14} color={electricCyan} />
        </View>
      </View>

      <View style={styles.weekRow}>
        {weekDates.map((item, index) => {
          const activity = activityData[item.date];
          const hasMe = activity?.me || false;
          const hasPartner = activity?.partner || false;
          const hasBoth = hasMe && hasPartner;

          return (
            <View key={item.date} style={styles.dayColumn}>
              <ThemedText type="small" style={styles.dayLabel}>
                {dayLabels[index]}
              </ThemedText>
              <View
                style={[
                  styles.dayCell,
                  hasBoth && styles.togetherBorder,
                  item.isToday && styles.todayCell,
                ]}
              >
                <ThemedText
                  style={[
                    styles.dayNumber,
                    item.isToday && styles.todayNumber,
                  ]}
                >
                  {item.day}
                </ThemedText>
              </View>
              <View style={styles.indicatorRow}>
                {hasMe ? (
                  <View style={[styles.indicator, { backgroundColor: electricCyan }]} />
                ) : null}
                {hasPartner ? (
                  <View style={[styles.indicator, { backgroundColor: lavenderPop }]} />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: electricCyan }]} />
          <ThemedText type="small" style={styles.legendText}>Io</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: lavenderPop }]} />
          <ThemedText type="small" style={styles.legendText}>Partner</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendBoth}>
            <View style={[styles.legendBarSmall, { backgroundColor: electricCyan }]} />
            <View style={[styles.legendBarSmall, { backgroundColor: lavenderPop }]} />
          </View>
          <ThemedText type="small" style={styles.legendText}>Insieme</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E8D7FF",
    padding: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: midnightIndigo,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    color: midnightIndigo,
    fontWeight: "700",
  },
  ctaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    color: electricCyan,
    fontWeight: "600",
    fontSize: 11,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
  },
  dayLabel: {
    color: secondaryText,
    fontSize: 10,
    marginBottom: 4,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  togetherBorder: {
    borderWidth: 2,
    borderColor: togetherGlow,
    shadowColor: togetherGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  todayCell: {
    backgroundColor: "rgba(0, 229, 255, 0.15)",
  },
  dayNumber: {
    color: midnightIndigo,
    fontWeight: "600",
    fontSize: 14,
  },
  todayNumber: {
    color: electricCyan,
    fontWeight: "700",
  },
  indicatorRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 4,
    height: 3,
  },
  indicator: {
    width: 10,
    height: 3,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#E8D7FF",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendBar: {
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  legendBoth: {
    flexDirection: "row",
    gap: 2,
  },
  legendBarSmall: {
    width: 8,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    color: secondaryText,
    fontSize: 10,
  },
});
