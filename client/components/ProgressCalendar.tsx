import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { CalendarDay, ActivityData } from "@/components/CalendarDay";
import { Spacing, BorderRadius } from "@/constants/theme";

LocaleConfig.locales["it"] = {
  monthNames: [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
  ],
  monthNamesShort: [
    "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
    "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
  ],
  dayNames: [
    "Domenica", "Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato",
  ],
  dayNamesShort: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
  today: "Oggi",
};
LocaleConfig.defaultLocale = "it";

const midnightIndigo = "#1A1458";
const secondaryText = "#3B2F8A";
const electricCyan = "#00E5FF";
const lavenderPop = "#B88BFF";

export type ActivityByDate = { [date: string]: ActivityData };

interface ProgressCalendarProps {
  activityData: ActivityByDate;
  mini?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  onPressCalendar?: () => void;
  onDayPress?: (date: string) => void;
}

export function ProgressCalendar({
  activityData,
  mini = false,
  showHeader = true,
  headerTitle = "Calendario progressi",
  onPressCalendar,
  onDayPress,
}: ProgressCalendarProps) {
  const today = new Date();
  const monthName = LocaleConfig.locales["it"].monthNames[today.getMonth()];
  const year = today.getFullYear();

  const calendarTheme = {
    backgroundColor: "transparent",
    calendarBackground: "transparent",
    textSectionTitleColor: secondaryText,
    textDayHeaderFontSize: mini ? 10 : 12,
    textDayHeaderFontWeight: "600" as const,
    monthTextColor: midnightIndigo,
    textMonthFontSize: mini ? 14 : 16,
    textMonthFontWeight: "700" as const,
    arrowColor: electricCyan,
    "stylesheet.calendar.header": {
      week: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: mini ? 4 : 8,
      },
    },
  };

  const renderDay = (props: any) => {
    const { date, state } = props;
    if (!date) return null;
    const activity = activityData[date.dateString];
    return (
      <CalendarDay
        date={date.dateString}
        day={date.day}
        state={state as "disabled" | "today" | "selected" | ""}
        activity={activity}
        mini={mini}
        onPress={onDayPress}
      />
    );
  };

  const calendarContent = (
    <Calendar
      theme={calendarTheme}
      hideExtraDays={false}
      enableSwipeMonths
      dayComponent={renderDay}
      style={[styles.calendar, mini && styles.calendarMini]}
    />
  );

  if (!showHeader) {
    return calendarContent;
  }

  return (
    <Pressable
      onPress={onPressCalendar}
      style={[styles.container, mini && styles.containerMini]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type={mini ? "body" : "h4"} style={styles.headerTitle}>
            {headerTitle}
          </ThemedText>
          <ThemedText type="small" style={styles.headerMonth}>
            {monthName} {year}
          </ThemedText>
        </View>
        <View style={styles.ctaContainer}>
          <ThemedText type="small" style={styles.ctaText}>
            Vedi storico
          </ThemedText>
          <Feather name="chevron-right" size={14} color={electricCyan} />
        </View>
      </View>

      {calendarContent}

      <View style={styles.legendContainer}>
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
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: midnightIndigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  containerMini: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: midnightIndigo,
    fontWeight: "700",
  },
  headerMonth: {
    color: secondaryText,
    marginTop: 2,
  },
  ctaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ctaText: {
    color: electricCyan,
    fontWeight: "600",
  },
  calendar: {
    marginHorizontal: -8,
  },
  calendarMini: {
    marginHorizontal: -4,
  },
  legendContainer: {
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
    gap: 6,
  },
  legendBar: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendBoth: {
    flexDirection: "row",
    gap: 2,
  },
  legendBarSmall: {
    width: 10,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    color: secondaryText,
  },
});
