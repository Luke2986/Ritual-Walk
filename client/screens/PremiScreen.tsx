import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
  BADGES,
  BADGE_GROUPS,
  formatKm,
  progressOf,
  type BadgeDefinition,
  type BadgeKey,
  type BadgeProgress,
} from "@shared/badges";

import { ThemedText } from "@/components/ThemedText";
import { BadgeIcon } from "@/components/BadgeIcon";
import { NeonButton } from "@/components/NeonButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { MAX_APP_WIDTH } from "@/hooks/useAppWidth";
import { badgesQueryKey, type BadgesResponse } from "@/lib/badgesQuery";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const EMPTY_PROGRESS: BadgeProgress = {
  totalKm: 0,
  walkCount: 0,
  togetherDays: 0,
  currentStreak: 0,
  thisWeekTogether: 0,
  currentGoodWeekRun: 0,
};

// "il 14 ottobre 2026", "l'8 ottobre 2026", "il 1° ottobre 2026"
function earnedOn(iso: string) {
  const date = new Date(iso);
  const day = date.getDate();
  const monthYear = date.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
  if (day === 1) return `il 1° ${monthYear}`;
  return `${day === 8 || day === 11 ? "l'" : "il "}${day} ${monthYear}`;
}

function BadgeItem({
  badge,
  earned,
  progress,
  onPress,
}: {
  badge: BadgeDefinition;
  earned: boolean;
  progress: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.badgeItem, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.name}, ${earned ? "sbloccato" : "da sbloccare"}`}
    >
      <BadgeIcon icon={badge.icon} earned={earned} progress={progress} />
      <ThemedText
        style={[styles.badgeName, !earned && styles.badgeNameLocked]}
        numberOfLines={2}
      >
        {badge.name}
      </ThemedText>
    </Pressable>
  );
}

function BadgeDetailSheet({
  badge,
  earnedAt,
  progress,
  onClose,
}: {
  badge: BadgeDefinition | null;
  earnedAt: string | undefined;
  progress: BadgeProgress;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const status = badge ? progressOf(badge, progress) : null;
  const fraction = badge && status ? status.value / badge.target : 0;

  return (
    <Modal
      visible={badge !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        {badge && status ? (
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.backgroundDefault,
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <BadgeIcon
                icon={badge.icon}
                earned={!!earnedAt}
                progress={fraction}
                size={96}
              />
              <ThemedText type="h3" style={styles.sheetTitle}>
                {badge.name}
              </ThemedText>
              <ThemedText
                style={[
                  styles.sheetDescription,
                  { color: theme.textSecondary },
                ]}
              >
                {badge.description}
              </ThemedText>
            </View>

            {earnedAt ? (
              <View style={styles.earnedRow}>
                <Feather name="check-circle" size={18} color="#FF2FB3" />
                <ThemedText style={styles.earnedText}>
                  Sbloccato {earnedOn(earnedAt)}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.progressBlock}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(fraction, 1) * 100}%` },
                    ]}
                  />
                </View>
                <ThemedText
                  style={[styles.progressText, { color: theme.textSecondary }]}
                >
                  {status.label}
                </ThemedText>
              </View>
            )}

            <NeonButton
              onPress={onClose}
              size="large"
              style={styles.closeButton}
            >
              Chiudi
            </NeonButton>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

export default function PremiScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { couple, refreshUser } = useAuth();
  const [selected, setSelected] = useState<BadgeDefinition | null>(null);

  const { data, refetch } = useQuery<BadgesResponse>({
    queryKey: badgesQueryKey(),
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([refetch({ throwOnError: true }), refreshUser()]);
    } catch {
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

  const progress = data?.progress ?? EMPTY_PROGRESS;
  const earnedAt = useMemo(
    () =>
      new Map<BadgeKey, string>(
        (data?.earned ?? []).map((badge) => [badge.key, badge.earnedAt]),
      ),
    [data],
  );

  const nextGoal = useMemo(
    () =>
      BADGES.find(
        (badge) => badge.metric === "totalKm" && !earnedAt.has(badge.key),
      ),
    [earnedAt],
  );

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
        {!couple ? (
          <View style={styles.infoCard}>
            <Feather name="users" size={20} color="#B88BFF" />
            <ThemedText style={styles.infoText}>
              I premi sono del vostro rituale: collega il tuo account a chi
              cammina con te per iniziare a sbloccarli.
            </ThemedText>
          </View>
        ) : nextGoal ? (
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
                  {nextGoal.target} km totali
                </ThemedText>
                <ThemedText type="caption" style={styles.goalRemaining}>
                  Mancano{" "}
                  {formatKm(Math.max(nextGoal.target - progress.totalKm, 0))} km
                </ThemedText>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        {BADGE_GROUPS.map(({ group, title }) => (
          <View key={group}>
            <View style={styles.sectionHeader}>
              <ThemedText type="h4">{title}</ThemedText>
            </View>
            <View style={styles.badgeGrid}>
              {BADGES.filter((badge) => badge.group === group).map((badge) => (
                <BadgeItem
                  key={badge.key}
                  badge={badge}
                  earned={earnedAt.has(badge.key)}
                  progress={progressOf(badge, progress).value / badge.target}
                  onPress={() => setSelected(badge)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <BadgeDetailSheet
        badge={selected}
        earnedAt={selected ? earnedAt.get(selected.key) : undefined}
        progress={progress}
        onClose={() => setSelected(null)}
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(184, 139, 255, 0.1)",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#3B2F8A",
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
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  badgeItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    width: "100%",
    maxWidth: MAX_APP_WIDTH,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    ...Shadows.cardElevated,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  sheetTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  sheetDescription: {
    fontSize: 16,
    textAlign: "center",
  },
  earnedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  earnedText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1458",
  },
  progressBlock: {
    marginBottom: Spacing["2xl"],
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(59, 47, 138, 0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#B88BFF",
  },
  progressText: {
    marginTop: Spacing.sm,
    fontSize: 14,
    textAlign: "center",
  },
  closeButton: {
    width: "100%",
  },
});
