import React, { useState, useEffect, useMemo, useCallback } from "react";
import { StyleSheet, View, ScrollView, RefreshControl, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { EmptyState } from "@/components/EmptyState";
import { TimeRangeToggle, TimeRange } from "@/components/TimeRangeToggle";
import { WeeklyDualBarChart } from "@/components/WeeklyDualBarChart";
import { MonthlyDualBarChart } from "@/components/MonthlyDualBarChart";
import { YearlyDualBarChart } from "@/components/YearlyDualBarChart";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { HistoryStackParamList } from "@/navigation/HistoryStackNavigator";
import {
  StatsResponse,
  getDateRange,
  aggregateWeeklyStats,
  aggregateMonthlyStats,
  aggregateYearlyStats,
} from "@/lib/statsAggregation";

type HistoryScreenRouteProp = RouteProp<HistoryStackParamList, "History">;

export default function HistoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { couple, refreshUser } = useAuth();
  const route = useRoute<HistoryScreenRouteProp>();
  
  const initialRange = route.params?.range || "week";
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);

  useEffect(() => {
    if (route.params?.range) {
      setTimeRange(route.params.range);
    }
  }, [route.params?.range]);

  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);

  const { data: statsData, isLoading, refetch } = useQuery<StatsResponse>({
    queryKey: ["/api/walks/stats", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const url = new URL("/api/walks/stats", window.location.origin);
      url.searchParams.set("startDate", dateRange.start.toISOString().split("T")[0]);
      url.searchParams.set("endDate", dateRange.end.toISOString().split("T")[0]);
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      return response.json();
    },
    enabled: !!couple,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.allSettled([refetch(), refreshUser()]);
    } catch (error) {
      const message = "Sei offline: dati non aggiornati";
      if (Platform.OS === "web") {
        console.warn(message);
      } else {
        Alert.alert("Errore", message);
      }
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshUser, refreshing]);

  const weeklyStats = useMemo(() => {
    if (!statsData?.walks) return { ioKm: [0, 0, 0, 0, 0, 0, 0], partnerKm: [0, 0, 0, 0, 0, 0, 0] };
    return aggregateWeeklyStats(statsData.walks, statsData.userId, statsData.partnerId);
  }, [statsData]);

  const monthlyStats = useMemo(() => {
    if (!statsData?.walks) return { ioKm: [0, 0, 0, 0], partnerKm: [0, 0, 0, 0] };
    return aggregateMonthlyStats(statsData.walks, statsData.userId, statsData.partnerId);
  }, [statsData]);

  const yearlyStats = useMemo(() => {
    if (!statsData?.walks) return { ioKm: Array(12).fill(0), partnerKm: Array(12).fill(0) };
    return aggregateYearlyStats(statsData.walks, statsData.userId, statsData.partnerId);
  }, [statsData]);

  const renderChart = () => {
    switch (timeRange) {
      case "week":
        return <WeeklyDualBarChart data={weeklyStats} />;
      case "month":
        return <MonthlyDualBarChart data={monthlyStats} />;
      case "year":
        return <YearlyDualBarChart data={yearlyStats} />;
      default:
        return null;
    }
  };

  if (!couple) {
    return (
      <LinearGradient
        colors={[theme.backgroundRoot, theme.backgroundDefault]}
        style={styles.gradient}
      >
        <View
          style={[
            styles.emptyContainer,
            {
              paddingTop: headerHeight + Spacing.xl,
              paddingBottom: tabBarHeight + Spacing.xl,
            },
          ]}
        >
          <EmptyState
            icon="heart"
            title="Collega il Partner"
            description="Devi collegare il tuo partner per vedere le statistiche"
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsSection}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Statistiche
          </ThemedText>

          <View style={styles.toggleContainer}>
            <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
          </View>

          <Animated.View
            key={timeRange}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            {renderChart()}
          </Animated.View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const midnightIndigo = "#1A1458";

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  statsSection: {
    flex: 1,
  },
  sectionTitle: {
    color: midnightIndigo,
    marginBottom: Spacing.md,
  },
  toggleContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
});
