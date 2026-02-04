import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  StyleSheet, 
  View, 
  Platform, 
  Linking, 
  Pressable,
  AccessibilityInfo,
  AppState,
  AppStateStatus,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Pedometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { NeonButton } from "@/components/NeonButton";
import { useTheme } from "@/hooks/useTheme";
import { useWalkSession } from "@/hooks/useWalkSession";
import { WalkKpiRow } from "@/components/walk/WalkKpiRow";
import { StopSlider } from "@/components/walk/StopSlider";
import { HoldToStopButton } from "@/components/walk/HoldToStopButton";
import { PocketLockOverlay } from "@/components/walk/PocketLockOverlay";
import { WalkSummarySheet } from "@/components/walk/WalkSummarySheet";
import { Spacing, Colors, BorderRadius, Shadows } from "@/constants/theme";

export default function TrackWalkScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const {
    sessionState,
    steps,
    distanceKm,
    durationSeconds,
    isLocked,
    isPedometerAvailable,
    startSession,
    stopSession,
    toggleLock,
    unlock,
    confirmSummary,
    dismissSummary,
    formatDuration,
    formatDurationAccessible,
  } = useWalkSession();

  const [pedometerPermission, setPedometerPermission] = useState<boolean | null>(null);
  const pulseScale = useSharedValue(1);
  const chipPulse = useSharedValue(1);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const checkPedometerPermission = useCallback(async () => {
    if (Platform.OS === "ios") {
      try {
        const [isAvailable, permissionResult] = await Promise.all([
          Pedometer.isAvailableAsync(),
          Pedometer.getPermissionsAsync(),
        ]);
        
        if (isAvailable) {
          setPedometerPermission(true);
          return;
        }
        
        if (permissionResult.granted || permissionResult.status === "granted") {
          setPedometerPermission(true);
          return;
        }
        
        if (permissionResult.status === "undetermined") {
          setPedometerPermission(null);
          return;
        }
        
        setPedometerPermission(false);
      } catch (error) {
        console.error("Error checking pedometer permission:", error);
        const isAvailable = await Pedometer.isAvailableAsync().catch(() => false);
        setPedometerPermission(isAvailable);
      }
    } else {
      setPedometerPermission(true);
    }
  }, []);

  useEffect(() => {
    checkPedometerPermission();
    
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        checkPedometerPermission();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [checkPedometerPermission]);

  useEffect(() => {
    if (sessionState === "idle") {
      pulseScale.value = withRepeat(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [sessionState]);

  useEffect(() => {
    if (sessionState === "running" && !isLocked) {
      chipPulse.value = withRepeat(
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      chipPulse.value = withTiming(1);
    }
  }, [sessionState, isLocked]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const chipPulseStyle = useAnimatedStyle(() => ({
    opacity: chipPulse.value,
  }));

  const handleStartSession = async () => {
    if (Platform.OS === "ios" && !pedometerPermission) {
      const result = await Pedometer.requestPermissionsAsync();
      setPedometerPermission(result.granted);
      if (!result.granted) {
        return;
      }
    }
    
    await startSession();
  };

  const requestPedometerPermission = async () => {
    const result = await Pedometer.requestPermissionsAsync();
    setPedometerPermission(result.granted);
  };

  if (Platform.OS === "ios" && pedometerPermission === false) {
    return (
      <LinearGradient
        colors={[theme.backgroundRoot, theme.backgroundDefault]}
        style={styles.gradient}
      >
        <View
          style={[
            styles.permissionContainer,
            { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
            <Feather name="activity" size={48} color={theme.primary} />
          </View>
          <ThemedText type="h3" style={styles.permissionTitle}>
            Accesso al Movimento
          </ThemedText>
          <ThemedText type="body" style={[styles.permissionText, { color: theme.textSecondary }]}>
            Abilita 'Movimento' nelle impostazioni per contare i passi durante le tue camminate
          </ThemedText>

          <NeonButton
            onPress={async () => {
              try {
                await Linking.openSettings();
              } catch (error) {
                console.error("Cannot open settings");
              }
            }}
            style={styles.permissionButton}
          >
            Apri Impostazioni
          </NeonButton>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <View style={[styles.container, { paddingTop: headerHeight + Spacing.lg }]}>
        {sessionState === "idle" ? (
          <View style={[styles.idleContainer, { paddingBottom: tabBarHeight + Spacing.xl }]}>
            <View style={styles.idleContent}>
              <View style={[styles.heroIcon, { backgroundColor: `${Colors.light.accentCyan}15` }]}>
                <Feather name="activity" size={64} color={Colors.light.accentCyan} />
              </View>
              <ThemedText type="h2" style={styles.heroTitle}>
                Pronto per il rituale?
              </ThemedText>
              <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                Inizia una sessione per tracciare i tuoi passi
              </ThemedText>

              {Platform.OS === "android" ? (
                <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
                  <Feather name="info" size={16} color={theme.textSecondary} />
                  <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
                    Su Android, i passi in background richiedono Health Connect (fase 2)
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <View style={styles.startButtonContainer}>
              <NeonButton 
                onPress={handleStartSession} 
                size="large"
                style={styles.startButton}
                testID="button-start-session"
              >
                <View style={styles.startButtonContent}>
                  <View style={[styles.recordDot, { backgroundColor: "#FFFFFF" }]} />
                  <ThemedText style={styles.startButtonText}>Inizia</ThemedText>
                </View>
              </NeonButton>
            </View>
          </View>
        ) : null}

        {sessionState === "running" ? (
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={[styles.runningContainer, { paddingBottom: tabBarHeight + Spacing.xl }]}
          >
            <View style={styles.statusBar}>
              <View 
                style={[styles.statusChip, { backgroundColor: `${Colors.light.accentMagenta}20` }]}
                testID="status-chip-running"
              >
                <Animated.View style={[styles.statusDot, chipPulseStyle]} />
                <ThemedText style={[styles.statusText, { color: Colors.light.accentMagenta }]}>
                  In corso
                </ThemedText>
              </View>
            </View>

            <View style={styles.kpiSection}>
              <WalkKpiRow
                steps={steps}
                distanceKm={distanceKm}
                durationFormatted={formatDuration(durationSeconds)}
                durationAccessible={formatDurationAccessible(durationSeconds)}
              />
            </View>

            <View style={styles.motivationSection}>
              <ThemedText style={[styles.motivationText, { color: theme.textSecondary }]}>
                Continua cos&igrave;! Ogni passo conta.
              </ThemedText>
            </View>

            <View style={styles.bottomControls}>
              <View style={styles.lockToggle}>
                <Pressable
                  onPress={toggleLock}
                  testID="button-toggle-lock"
                  style={[
                    styles.lockButton,
                    { backgroundColor: isLocked ? `${Colors.light.accentCyan}20` : theme.cardBackground },
                  ]}
                  accessibilityLabel={isLocked ? "Sblocca tocchi" : "Blocca tocchi"}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isLocked }}
                >
                  <Feather 
                    name={isLocked ? "lock" : "unlock"} 
                    size={20} 
                    color={isLocked ? Colors.light.accentCyan : theme.textSecondary} 
                  />
                  <ThemedText 
                    style={[
                      styles.lockButtonText, 
                      { color: isLocked ? Colors.light.accentCyan : theme.textSecondary }
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
          visible={isLocked && sessionState === "running"}
          steps={steps}
          durationFormatted={formatDuration(durationSeconds)}
          onUnlock={unlock}
        />

        <WalkSummarySheet
          visible={sessionState === "summary"}
          steps={steps}
          distanceKm={distanceKm}
          durationFormatted={formatDuration(durationSeconds)}
          onConfirm={confirmSummary}
          onDismiss={dismissSummary}
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
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  permissionText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    minWidth: 200,
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
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
  startButtonText: {
    color: Colors.light.buttonText,
    fontWeight: "700",
    fontSize: 18,
  },
  runningContainer: {
    flex: 1,
  },
  statusBar: {
    alignItems: "center",
    marginBottom: Spacing.xl,
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
  kpiSection: {
    marginBottom: Spacing["2xl"],
  },
  motivationSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  motivationText: {
    fontSize: 16,
    textAlign: "center",
  },
  bottomControls: {
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  lockToggle: {
    paddingHorizontal: Spacing.lg,
  },
  lockButton: {
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
