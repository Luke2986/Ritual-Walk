import React, { useState, useCallback } from "react";
import { StyleSheet, View, ScrollView, Pressable, RefreshControl, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  kmThreshold: number | null;
  streakThreshold: number | null;
  walkCountThreshold: number | null;
  earned: boolean;
}

const DEFAULT_BADGES: Badge[] = [
  { id: "1", name: "Primo Passo", description: "Completa la tua prima camminata", icon: "play", kmThreshold: null, streakThreshold: null, walkCountThreshold: 1, earned: false },
  { id: "2", name: "5 Km", description: "Raggiungi 5 km totali", icon: "map-pin", kmThreshold: 5, streakThreshold: null, walkCountThreshold: null, earned: false },
  { id: "3", name: "10 Km", description: "Raggiungi 10 km totali", icon: "navigation", kmThreshold: 10, streakThreshold: null, walkCountThreshold: null, earned: false },
  { id: "4", name: "Maratoneta", description: "Raggiungi 42 km totali", icon: "award", kmThreshold: 42, streakThreshold: null, walkCountThreshold: null, earned: false },
  { id: "5", name: "3 Giorni", description: "Mantieni uno streak di 3 giorni", icon: "zap", kmThreshold: null, streakThreshold: 3, walkCountThreshold: null, earned: false },
  { id: "6", name: "7 Giorni", description: "Mantieni uno streak di 7 giorni", icon: "star", kmThreshold: null, streakThreshold: 7, walkCountThreshold: null, earned: false },
  { id: "7", name: "30 Giorni", description: "Mantieni uno streak di 30 giorni", icon: "sun", kmThreshold: null, streakThreshold: 30, walkCountThreshold: null, earned: false },
  { id: "8", name: "10 Camminate", description: "Completa 10 camminate", icon: "trending-up", kmThreshold: null, streakThreshold: null, walkCountThreshold: 10, earned: false },
  { id: "9", name: "100 Km", description: "Raggiungi 100 km totali", icon: "target", kmThreshold: 100, streakThreshold: null, walkCountThreshold: null, earned: false },
];

function BadgeItem({ badge, totalKm, currentStreak, walkCount }: { 
  badge: Badge; 
  totalKm: number;
  currentStreak: number;
  walkCount: number;
}) {
  const { theme } = useTheme();
  
  const isEarned = React.useMemo(() => {
    if (badge.kmThreshold && totalKm >= badge.kmThreshold) return true;
    if (badge.streakThreshold && currentStreak >= badge.streakThreshold) return true;
    if (badge.walkCountThreshold && walkCount >= badge.walkCountThreshold) return true;
    return false;
  }, [badge, totalKm, currentStreak, walkCount]);

  const progress = React.useMemo(() => {
    if (badge.kmThreshold) return Math.min(totalKm / badge.kmThreshold, 1);
    if (badge.streakThreshold) return Math.min(currentStreak / badge.streakThreshold, 1);
    if (badge.walkCountThreshold) return Math.min(walkCount / badge.walkCountThreshold, 1);
    return 0;
  }, [badge, totalKm, currentStreak, walkCount]);

  return (
    <View style={styles.badgeItem}>
      {isEarned ? (
        <LinearGradient
          colors={["#FF4D6D", "#FF2FB3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badgeCircle}
        >
          <Feather name={badge.icon as any} size={28} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={styles.badgeCircleLocked}>
          <View style={[styles.badgeProgress, { height: `${progress * 100}%` }]} />
          <Feather name={badge.icon as any} size={28} color="rgba(59, 47, 138, 0.4)" />
        </View>
      )}
      <ThemedText 
        style={[
          styles.badgeName, 
          !isEarned && styles.badgeNameLocked
        ]}
        numberOfLines={2}
      >
        {badge.name}
      </ThemedText>
    </View>
  );
}

export default function PremiScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { couple } = useAuth();

  const { data: walksData, refetch } = useQuery<{ count: number }>({
    queryKey: ["/api/walks/count"],
    enabled: !!couple,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetch();
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
  }, [refetch, refreshing]);

  const totalKm = couple?.totalKm || 0;
  const currentStreak = couple?.currentStreak || 0;
  const walkCount = walksData?.count || 0;

  const nextGoal = React.useMemo(() => {
    const kmGoals = [5, 10, 42, 100];
    for (const goal of kmGoals) {
      if (totalKm < goal) {
        return { type: "km", value: goal, remaining: goal - totalKm };
      }
    }
    return null;
  }, [totalKm]);

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
            paddingBottom: tabBarHeight + Spacing["2xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {nextGoal ? (
          <View style={styles.goalCard}>
            <LinearGradient
              colors={["rgba(184, 139, 255, 0.2)", "rgba(255, 77, 109, 0.1)"]}
              style={styles.goalGradient}
            >
              <Feather name="target" size={24} color="#B88BFF" />
              <View style={styles.goalText}>
                <ThemedText type="small" style={styles.goalLabel}>
                  PROSSIMO OBIETTIVO
                </ThemedText>
                <ThemedText type="h4" style={styles.goalValue}>
                  {nextGoal.value} km totali
                </ThemedText>
                <ThemedText type="caption" style={styles.goalRemaining}>
                  Mancano {nextGoal.remaining.toFixed(1)} km
                </ThemedText>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">I Tuoi Premi</ThemedText>
        </View>

        <View style={styles.badgeGrid}>
          {DEFAULT_BADGES.map((badge) => (
            <BadgeItem
              key={badge.id}
              badge={badge}
              totalKm={totalKm}
              currentStreak={currentStreak}
              walkCount={walkCount}
            />
          ))}
        </View>
      </ScrollView>
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
  goalCard: {
    marginBottom: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  goalGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(184, 139, 255, 0.3)",
  },
  goalText: {
    marginLeft: Spacing.lg,
    flex: 1,
  },
  goalLabel: {
    color: "#B88BFF",
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 11,
  },
  goalValue: {
    color: "#1A1458",
    marginTop: 2,
  },
  goalRemaining: {
    color: "#3B2F8A",
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: Spacing.lg,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  badgeItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  badgeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF4D6D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  badgeCircleLocked: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 47, 138, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(59, 47, 138, 0.2)",
    overflow: "hidden",
  },
  badgeProgress: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(184, 139, 255, 0.3)",
  },
  badgeName: {
    marginTop: Spacing.sm,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: "#1A1458",
  },
  badgeNameLocked: {
    color: "rgba(59, 47, 138, 0.5)",
  },
});
