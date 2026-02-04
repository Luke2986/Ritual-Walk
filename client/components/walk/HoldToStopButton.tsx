import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, StyleSheet, Platform, TouchableWithoutFeedback } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const HOLD_DURATION = 2000;

interface HoldToStopButtonProps {
  onStop: () => void;
  disabled?: boolean;
}

export function HoldToStopButton({ onStop, disabled = false }: HoldToStopButtonProps) {
  const progress = useSharedValue(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }, []);

  const startHold = useCallback(() => {
    if (disabled || completedRef.current) return;
    
    cleanup();
    completedRef.current = false;
    setIsHolding(true);
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    progress.value = withTiming(1, {
      duration: HOLD_DURATION,
      easing: Easing.linear,
    });

    holdTimeoutRef.current = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setIsHolding(false);
        progress.value = withTiming(0, { duration: 150 });
        onStop();
      }
    }, HOLD_DURATION);
  }, [disabled, onStop, progress, cleanup]);

  const endHold = useCallback(() => {
    if (completedRef.current) return;
    
    cleanup();
    setIsHolding(false);
    progress.value = withTiming(0, { duration: 150 });
  }, [progress, cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    completedRef.current = false;
  }, [disabled]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (Platform.OS === "web") {
    return (
      <div
        data-testid="button-hold-to-stop"
        onMouseDown={(e) => {
          e.preventDefault();
          startHold();
        }}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={(e) => {
          e.preventDefault();
          startHold();
        }}
        onTouchEnd={endHold}
        onTouchCancel={endHold}
        style={{
          marginLeft: Spacing.lg,
          marginRight: Spacing.lg,
          height: 56,
          backgroundColor: "rgba(255, 71, 87, 0.15)",
          borderRadius: BorderRadius.lg,
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
        role="button"
        aria-label="Tieni premuto per 2 secondi per fermare la sessione"
      >
        <Animated.View style={[styles.progressBar, progressStyle]} />
        <View style={styles.content} pointerEvents="none">
          <Feather 
            name="square" 
            size={20} 
            color={isHolding ? "#FFFFFF" : Colors.light.error} 
          />
          <ThemedText style={[styles.text, isHolding && styles.textHolding]}>
            {isHolding ? "Rilascia per annullare" : "Tieni premuto per fermare"}
          </ThemedText>
        </View>
      </div>
    );
  }

  return (
    <TouchableWithoutFeedback
      onPressIn={startHold}
      onPressOut={endHold}
      disabled={disabled}
    >
      <View
        testID="button-hold-to-stop"
        style={[styles.container, disabled && styles.disabled]}
        accessibilityLabel="Tieni premuto per 2 secondi per fermare la sessione"
        accessibilityRole="button"
      >
        <Animated.View style={[styles.progressBar, progressStyle]} />
        <View style={styles.content}>
          <Feather 
            name="square" 
            size={20} 
            color={isHolding ? "#FFFFFF" : Colors.light.error} 
          />
          <ThemedText style={[styles.text, isHolding && styles.textHolding]}>
            {isHolding ? "Rilascia per annullare" : "Tieni premuto per fermare"}
          </ThemedText>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    height: 56,
    backgroundColor: "rgba(255, 71, 87, 0.15)",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.light.error,
    borderRadius: BorderRadius.lg,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  text: {
    color: Colors.light.error,
    fontSize: 16,
    fontWeight: "600",
  },
  textHolding: {
    color: "#FFFFFF",
  },
});
