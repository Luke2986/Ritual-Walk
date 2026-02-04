import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";

const electricCyan = "#00E5FF";
const lavenderPop = "#B88BFF";
const togetherGlow = "#FFE66D";
const midnightIndigo = "#1A1458";

export interface ActivityData {
  me: boolean;
  partner: boolean;
}

interface CalendarDayProps {
  date: string;
  day: number;
  state?: "disabled" | "today" | "selected" | "";
  activity?: ActivityData;
  mini?: boolean;
  onPress?: (date: string) => void;
}

export function CalendarDay({
  date,
  day,
  state,
  activity,
  mini = false,
  onPress,
}: CalendarDayProps) {
  const isDisabled = state === "disabled";
  const isToday = state === "today";
  const hasMe = activity?.me || false;
  const hasPartner = activity?.partner || false;
  const hasBoth = hasMe && hasPartner;

  const cellSize = mini ? 28 : 36;
  const barWidth = mini ? 10 : 14;
  const barHeight = mini ? 2 : 3;
  const fontSize = mini ? 12 : 14;

  return (
    <Pressable
      onPress={() => onPress?.(date)}
      style={[
        styles.container,
        { width: cellSize, height: cellSize + (mini ? 6 : 10) },
      ]}
    >
      <View
        style={[
          styles.dayCell,
          {
            width: cellSize,
            height: cellSize,
            borderRadius: mini ? 8 : 10,
          },
          hasBoth && styles.togetherBorder,
          isToday && styles.todayCell,
        ]}
      >
        <ThemedText
          style={[
            styles.dayText,
            { fontSize },
            isDisabled && styles.disabledText,
            isToday && styles.todayText,
          ]}
        >
          {day}
        </ThemedText>
      </View>

      {(hasMe || hasPartner) ? (
        <View style={styles.indicatorRow}>
          {hasMe ? (
            <View
              style={[
                styles.indicator,
                {
                  width: barWidth,
                  height: barHeight,
                  backgroundColor: electricCyan,
                },
              ]}
            />
          ) : null}
          {hasPartner ? (
            <View
              style={[
                styles.indicator,
                {
                  width: barWidth,
                  height: barHeight,
                  backgroundColor: lavenderPop,
                },
              ]}
            />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  togetherBorder: {
    borderWidth: 2,
    borderColor: togetherGlow,
    shadowColor: togetherGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  todayCell: {
    backgroundColor: "rgba(0, 229, 255, 0.15)",
  },
  dayText: {
    color: midnightIndigo,
    fontWeight: "600",
  },
  disabledText: {
    opacity: 0.3,
  },
  todayText: {
    color: electricCyan,
    fontWeight: "700",
  },
  indicatorRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  indicator: {
    borderRadius: 2,
  },
});
