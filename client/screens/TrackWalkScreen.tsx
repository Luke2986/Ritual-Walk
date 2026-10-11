import React, { useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Platform,
  Linking,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { NeonButton } from "@/components/NeonButton";
import { useTheme } from "@/hooks/useTheme";
import {
  useWalkSession,
  formatDuration,
  formatDurationAccessible,
} from "@/hooks/useWalkSession";
import { LiveRouteMap } from "@/components/walk/LiveRouteMap";
import { WalkKpiRow } from "@/components/walk/WalkKpiRow";
import { StopSlider } from "@/components/walk/StopSlider";
import { HoldToStopButton } from "@/components/walk/HoldToStopButton";
import { PocketLockOverlay } from "@/components/walk/PocketLockOverlay";
import { WalkSummarySheet } from "@/components/walk/WalkSummarySheet";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

export default function TrackWalkScreen() {
  const navigation = useNavigation<any>();
  const { partner } = useAuth();
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const {
    sessionState,
    isReady,
    steps,
    distanceKm,
    durationSeconds,
    points,
    gpsMode,
    isLocked,
    isSaving,
    saveError,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    toggleLock,
    unlock,
    confirmSummary,
    discardSession,
    newBadges,
    dismissNewBadges,
  } = useWalkSession();

  const chipPulse = useSharedValue(1);
  const route = useMemo(
    () => points.map(({ latitude, longitude }) => ({ latitude, longitude })),
    [points],
  );
  const isActive = sessionState === "running" || sessionState === "paused";

  useEffect(() => {
    if (sessionState === "running" && !isLocked) {
      chipPulse.value = withRepeat(
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      chipPulse.value = withTiming(1);
    }
  }, [sessionState, isLocked, chipPulse]);

  const chipPulseStyle = useAnimatedStyle(() => ({
    opacity: chipPulse.value,
  }));

  const handleStartSession = async () => {
    let gps;
    try {
      gps = await startSession();
    } catch {
      Alert.alert(
        "Impossibile iniziare",
        "Serve una connessione a internet per iniziare la camminata. Riprova tra poco.",
      );
      return;
    }

    if (gps === "off" && Platform.OS !== "web") {
      Alert.alert(
        "GPS non attivo",
        "Senza accesso alla posizione registriamo solo passi e tempo, senza mappa del percorso.",
        [
          { text: "Ok", style: "cancel" },
          { text: "Impostazioni", onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const gpsLabel =
    gpsMode === "background"
      ? "GPS attivo"
      : gpsMode === "foreground"
        ? "GPS solo ad app aperta"
        : "GPS non attivo";

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <View
        style={[styles.container, { paddingTop: headerHeight + Spacing.lg }]}
      >
        {sessionState === "idle" || sessionState === "starting" ? (
          <View
            style={[
              styles.idleContainer,
              { paddingBottom: tabBarHeight + Spacing.xl },
            ]}
          >
            <View style={styles.idleContent}>
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: `${Colors.light.accentCyan}15` },
                ]}
              >
                <Feather
                  name="activity"
                  size={64}
                  color={Colors.light.accentCyan}
                />
              </View>
              <ThemedText type="h2" style={styles.heroTitle}>
                {"È l'ora del rituale"}
              </ThemedText>
              <ThemedText
                style={[styles.heroSubtitle, { color: theme.textSecondary }]}
              >
                Traccia percorso, distanza e passi della tua camminata
              </ThemedText>
            </View>

            <View style={styles.startButtonContainer}>
              <NeonButton
                onPress={handleStartSession}
                size="large"
                style={styles.startButton}
                disabled={!isReady || sessionState === "starting"}
                testID="button-start-session"
              >
                {sessionState === "starting" ? (
                  <ActivityIndicator color={Colors.light.buttonText} />
                ) : (
                  <View style={styles.startButtonContent}>
                    <View
                      style={[styles.recordDot, { backgroundColor: "#FFFFFF" }]}
                    />
                    <ThemedText style={styles.startButtonText}>
                      Inizia
                    </ThemedText>
                  </View>
                )}
              </NeonButton>
              <Pressable
                onPress={() => navigation.navigate("AddWalk")}
                style={styles.addWalkLink}
                testID="link-add-walk"
              >
                <ThemedText
                  style={[styles.addWalkText, { color: theme.textSecondary }]}
                >
                  Hai camminato senza registrare? Aggiungila a mano
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {isActive ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[
              styles.runningContainer,
              { paddingBottom: tabBarHeight + Spacing.lg },
            ]}
          >
            <View style={styles.statusBar}>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: `${Colors.light.accentMagenta}20` },
                ]}
                testID="status-chip-running"
              >
                <Animated.View style={[styles.statusDot, chipPulseStyle]} />
                <ThemedText
                  style={[
                    styles.statusText,
                    { color: Colors.light.accentMagenta },
                  ]}
                >
                  {sessionState === "paused" ? "In pausa" : "In corso"}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.gpsChip,
                  { backgroundColor: theme.cardBackground },
                ]}
              >
                <Feather
                  name="navigation"
                  size={12}
                  color={
                    gpsMode === "off"
                      ? theme.textSecondary
                      : Colors.light.success
                  }
                />
                <ThemedText
                  style={[styles.gpsText, { color: theme.textSecondary }]}
                >
                  {gpsLabel}
                </ThemedText>
              </View>
            </View>

            <View style={styles.mapCard}>
              <LiveRouteMap points={route} />
            </View>

            <View style={styles.kpiSection}>
              <WalkKpiRow
                steps={steps}
                distanceKm={distanceKm}
                durationFormatted={formatDuration(durationSeconds)}
                durationAccessible={formatDurationAccessible(durationSeconds)}
              />
            </View>

            <View style={styles.bottomControls}>
              <View style={styles.controlRow}>
                <Pressable
                  onPress={
                    sessionState === "paused" ? resumeSession : pauseSession
                  }
                  disabled={isLocked}
                  testID="button-toggle-pause"
                  style={[
                    styles.lockButton,
                    { backgroundColor: theme.cardBackground },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    sessionState === "paused" ? "Riprendi" : "Pausa"
                  }
                >
                  <Feather
                    name={sessionState === "paused" ? "play" : "pause"}
                    size={20}
                    color={theme.textSecondary}
                  />
                  <ThemedText
                    style={[
                      styles.lockButtonText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {sessionState === "paused" ? "Riprendi" : "Pausa"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={toggleLock}
                  testID="button-toggle-lock"
                  style={[
                    styles.lockButton,
                    {
                      backgroundColor: isLocked
                        ? `${Colors.light.accentCyan}20`
                        : theme.cardBackground,
                    },
                  ]}
                  accessibilityLabel={
                    isLocked ? "Sblocca tocchi" : "Blocca tocchi"
                  }
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isLocked }}
                >
                  <Feather
                    name={isLocked ? "lock" : "unlock"}
                    size={20}
                    color={
                      isLocked ? Colors.light.accentCyan : theme.textSecondary
                    }
                  />
                  <ThemedText
                    style={[
                      styles.lockButtonText,
                      {
                        color: isLocked
                          ? Colors.light.accentCyan
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {isLocked ? "Bloccato" : "Blocca"}
                  </ThemedText>
                </Pressable>
              </View>

              {Platform.OS === "web" ? (
                <HoldToStopButton onStop={stopSession} disabled={isLocked} />
              ) : (
                <StopSlider onStop={stopSession} disabled={isLocked} />
              )}
            </View>
          </Animated.View>
        ) : null}

        <PocketLockOverlay
          visible={isLocked && isActive}
          steps={steps}
          durationFormatted={formatDuration(durationSeconds)}
          onUnlock={unlock}
        />

        <WalkSummarySheet
          visible={sessionState === "summary"}
          partnerName={partner?.nickname ?? null}
          newBadges={newBadges}
          onShowBadges={() => {
            dismissNewBadges();
            navigation.navigate("PremiTab");
          }}
          onCloseBadges={dismissNewBadges}
          steps={steps}
          distanceKm={distanceKm}
          durationFormatted={formatDuration(durationSeconds)}
          isSaving={isSaving}
          error={saveError}
          onConfirm={confirmSummary}
          onDiscard={discardSession}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  idleContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  idleContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  heroIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  heroSubtitle: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: Spacing.xl,
  },
  startButtonContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  startButton: {
    width: "100%",
    height: 64,
  },
  startButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  recordDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  addWalkLink: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  addWalkText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  startButtonText: {
    color: Colors.light.buttonText,
    fontWeight: "700",
    fontSize: 18,
  },
  runningContainer: {
    flex: 1,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: "600",
  },
  mapCard: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.card,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accentMagenta,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiSection: {},
  bottomControls: {
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  controlRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  lockButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  lockButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
