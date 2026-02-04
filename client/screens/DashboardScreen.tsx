import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View, FlatList, RefreshControl, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { NeonCard } from "@/components/NeonCard";
import { StatCard } from "@/components/StatCard";
import { WalkCard } from "@/components/WalkCard";
import { EmptyState } from "@/components/EmptyState";
import { WeeklyProgressCalendar } from "@/components/WeeklyProgressCalendar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";
import {
  StatsResponse,
  getDateRange,
  buildActivityByDate,
} from "@/lib/statsAggregation";

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, "Dashboard">;
};

interface WalkData {
  id: string;
  distanceKm: number;
  durationSeconds: number;
  startedAt: string;
  userNickname: string;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, couple, partner, refreshUser } = useAuth();
  const rootNavigation = useNavigation<any>();

  const streakGlow = useSharedValue(0.3);

  React.useEffect(() => {
    if (couple && couple.currentStreak > 0) {
      streakGlow.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [couple?.currentStreak]);

  const streakGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: streakGlow.value,
  }));

  const { data: recentWalks, isLoading, refetch } = useQuery<WalkData[]>({
    queryKey: ["/api/walks/recent"],
    enabled: !!couple,
  });

  const weekRange = useMemo(() => getDateRange("week"), []);

  const { data: statsData, refetch: refetchStats } = useQuery<StatsResponse>({
    queryKey: ["/api/walks/stats", weekRange.start.toISOString(), weekRange.end.toISOString()],
    queryFn: async () => {
      const url = new URL("/api/walks/stats", window.location.origin);
      url.searchParams.set("startDate", weekRange.start.toISOString().split("T")[0]);
      url.searchParams.set("endDate", weekRange.end.toISOString().split("T")[0]);
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      return response.json();
    },
    enabled: !!couple,
  });

  const activityData = useMemo(() => {
    if (!statsData?.walks) return {};
    return buildActivityByDate(statsData.walks, statsData.userId, statsData.partnerId);
  }, [statsData]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.allSettled([refetch(), refetchStats(), refreshUser()]);
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
  }, [refetch, refetchStats, refreshUser, refreshing]);

  const handleInvitePartner = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rootNavigation.navigate("MainTabs", { screen: "ProfileTab" });
  };

  const renderWalk = ({ item }: { item: WalkData }) => (
    <WalkCard
      distance={item.distanceKm}
      duration={item.durationSeconds}
      date={item.startedAt}
      userNickname={item.userNickname}
    />
  );

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.greeting}>
        <ThemedText type="body" style={styles.welcomeText}>
          Benvenuto,
        </ThemedText>
        <ThemedText type="h2" style={styles.userName}>{user?.nickname}</ThemedText>
      </View>

      {couple ? (
        <>
          <Animated.View style={[styles.streakCardWrapper, streakGlowStyle]}>
            <NeonCard
              title="Streak Attuale"
              glowColor="#FFB300"
              style={styles.streakCard}
            >
              <View style={styles.streakContent}>
                <View style={styles.streakIconWrapper}>
                  <Feather name="zap" size={36} color="#FFB300" />
                </View>
                <View style={styles.streakText}>
                  <ThemedText style={styles.streakNumber}>
                    {couple.currentStreak}
                  </ThemedText>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>
                    {couple.currentStreak === 1 ? "giorno" : "giorni"}
                  </ThemedText>
                </View>
                {couple.currentStreak > 0 ? (
                  <View style={styles.streakBadge}>
                    <Feather name="award" size={16} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
            </NeonCard>
          </Animated.View>

          <View style={styles.statsRow}>
            <StatCard
              label="Km Totali"
              value={couple.totalKm.toFixed(1)}
              icon="map"
              color="#00E5FF"
            />
            <View style={{ width: Spacing.lg }} />
            {partner ? (
              <StatCard
                label="Partner"
                value={partner.nickname}
                icon="heart"
                color="#FF1493"
              />
            ) : (
              <Pressable style={styles.inviteCard} onPress={handleInvitePartner}>
                <LinearGradient
                  colors={["rgba(255, 20, 147, 0.15)", "rgba(255, 20, 147, 0.05)"]}
                  style={styles.inviteGradient}
                >
                  <View style={styles.inviteIconContainer}>
                    <Feather name="user-plus" size={22} color="#FF1493" />
                  </View>
                  <ThemedText type="small" style={styles.inviteLabel}>
                    PARTNER
                  </ThemedText>
                  <ThemedText style={styles.inviteText}>In attesa</ThemedText>
                  <View style={styles.inviteButton}>
                    <ThemedText style={styles.inviteButtonText}>Invita</ThemedText>
                  </View>
                </LinearGradient>
              </Pressable>
            )}
          </View>

          <View style={styles.calendarSection}>
            <WeeklyProgressCalendar
              activityData={activityData}
              onPress={() => {
                rootNavigation.navigate("HistoryTab", {
                  screen: "History",
                  params: { focus: "stats", range: "month" },
                });
              }}
            />
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Camminate Recenti</ThemedText>
          </View>
        </>
      ) : (
        <Pressable onPress={handleInvitePartner}>
          <NeonCard
            title="Collega il Partner"
            variant="highlight"
            style={styles.connectCard}
            glowColor="#FF1493"
          >
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Crea o inserisci un Ritual Code per collegare il tuo partner
            </ThemedText>
            <View style={styles.connectButton}>
              <Feather name="plus" size={18} color="#FFFFFF" />
              <ThemedText style={styles.connectButtonText}>Collega Ora</ThemedText>
            </View>
          </NeonCard>
        </Pressable>
      )}
    </View>
  );

  const EmptyWalks = () => (
    <EmptyState
      icon="map-pin"
      title="Nessuna camminata"
      description="Inizia una nuova camminata per vedere le tue attivita qui"
    />
  );

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <FlatList
        data={couple ? (recentWalks || []) : []}
        renderItem={renderWalk}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={couple ? EmptyWalks : null}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["2xl"] + 40,
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
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
  },
  headerContent: {
    marginBottom: Spacing.lg,
  },
  greeting: {
    marginBottom: Spacing["2xl"],
  },
  welcomeText: {
    color: "#4A4080",
    fontWeight: "300",
    fontSize: 16,
  },
  userName: {
    fontWeight: "800",
    color: "#1A1458",
    marginTop: 2,
  },
  streakCardWrapper: {
    marginBottom: Spacing.lg,
    shadowColor: "#FFB300",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
  },
  streakCard: {},
  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  streakIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 179, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakText: {
    marginLeft: Spacing.lg,
    flex: 1,
  },
  streakNumber: {
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
    color: "#1A1458",
  },
  streakBadge: {
    backgroundColor: "#FFB300",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: Spacing["2xl"],
  },
  inviteCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  inviteGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 20, 147, 0.3)",
    alignItems: "center",
    minHeight: 140,
  },
  inviteIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 20, 147, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  inviteLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: "#4A4080",
    marginBottom: 2,
  },
  inviteText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1458",
    marginBottom: Spacing.sm,
  },
  inviteButton: {
    backgroundColor: "#FF1493",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  inviteButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarSection: {
    marginBottom: Spacing["2xl"],
  },
  sectionHeader: {
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  connectCard: {
    marginTop: Spacing.lg,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF1493",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
