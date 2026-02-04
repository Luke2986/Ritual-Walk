import React, { useState, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SCREEN_HEIGHT = Dimensions.get("window").height;
const UNLOCK_DURATION = 2000;
const CIRCLE_SIZE = 120;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface PocketLockOverlayProps {
  visible: boolean;
  steps: number;
  durationFormatted: string;
  onUnlock: () => void;
}

export function PocketLockOverlay({
  visible,
  steps,
  durationFormatted,
  onUnlock,
}: PocketLockOverlayProps) {
  const progress = useSharedValue(0);
  const [isPressing, setIsPressing] = useState(false);
  const pressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressIn = useCallback(() => {
    setIsPressing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    progress.value = withTiming(1, {
      duration: UNLOCK_DURATION,
      easing: Easing.linear,
    });

    pressTimeoutRef.current = setTimeout(() => {
      runOnJS(onUnlock)();
    }, UNLOCK_DURATION);
  }, [onUnlock, progress]);

  const handlePressOut = useCallback(() => {
    setIsPressing(false);
    
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }

    progress.value = withTiming(0, { duration: 200 });
  }, [progress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.unlockButton}
          accessibilityLabel="Tieni premuto per 2 secondi per sbloccare"
          accessibilityHint="Tieni premuto il lucchetto per sbloccare lo schermo"
        >
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.progressCircle}>
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <AnimatedCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={Colors.light.accentCyan}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedCircleProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
            />
          </Svg>
          <View style={styles.iconContainer}>
            <Feather 
              name={isPressing ? "unlock" : "lock"} 
              size={40} 
              color="#FFFFFF" 
            />
          </View>
        </Pressable>

        <ThemedText style={styles.instruction}>
          Tieni premuto per sbloccare
        </ThemedText>

        <View style={styles.miniStats}>
          <ThemedText style={styles.sessionLabel}>Sessione in corso...</ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{steps.toLocaleString("it-IT")}</ThemedText>
              <ThemedText style={styles.statLabel}>passi</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{durationFormatted}</ThemedText>
              <ThemedText style={styles.statLabel}>tempo</ThemedText>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 20, 88, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  content: {
    alignItems: "center",
  },
  unlockButton: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  progressCircle: {
    position: "absolute",
  },
  iconContainer: {
    width: CIRCLE_SIZE - STROKE_WIDTH * 4,
    height: CIRCLE_SIZE - STROKE_WIDTH * 4,
    borderRadius: (CIRCLE_SIZE - STROKE_WIDTH * 4) / 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  instruction: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing["3xl"],
    opacity: 0.9,
  },
  miniStats: {
    alignItems: "center",
  },
  sessionLabel: {
    color: Colors.light.accentMagenta,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.lg,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
});
