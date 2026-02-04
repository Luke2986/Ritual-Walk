import React, { useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const SLIDER_WIDTH = Dimensions.get("window").width - Spacing.lg * 2;
const HANDLE_SIZE = 56;
const TRACK_PADDING = 4;
const SLIDE_THRESHOLD = SLIDER_WIDTH - HANDLE_SIZE - TRACK_PADDING * 2;

interface StopSliderProps {
  onStop: () => void;
  disabled?: boolean;
}

export function StopSlider({ onStop, disabled = false }: StopSliderProps) {
  const translateX = useSharedValue(0);
  const isCompleted = useSharedValue(false);

  const triggerStop = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStop();
  }, [onStop]);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((event) => {
      if (isCompleted.value) return;
      
      const newX = Math.max(0, Math.min(event.translationX, SLIDE_THRESHOLD));
      translateX.value = newX;
      
      if (newX > SLIDE_THRESHOLD * 0.5 && newX < SLIDE_THRESHOLD * 0.6) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      if (isCompleted.value) return;
      
      if (translateX.value >= SLIDE_THRESHOLD * 0.9) {
        isCompleted.value = true;
        translateX.value = withSpring(SLIDE_THRESHOLD);
        runOnJS(triggerStop)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
      }
    });

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const textOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SLIDE_THRESHOLD * 0.5],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: translateX.value + HANDLE_SIZE + TRACK_PADDING,
  }));

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.track}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
        <Animated.View style={[styles.textContainer, textOpacity]}>
          <ThemedText style={styles.text}>Scorri per fermare</ThemedText>
        </Animated.View>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.handle, handleStyle]}>
            <Feather name="square" size={24} color={Colors.light.error} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  track: {
    width: SLIDER_WIDTH,
    height: HANDLE_SIZE + TRACK_PADDING * 2,
    backgroundColor: "rgba(255, 71, 87, 0.15)",
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    overflow: "hidden",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 71, 87, 0.3)",
    borderRadius: BorderRadius.xl,
  },
  textContainer: {
    position: "absolute",
    left: HANDLE_SIZE + Spacing.lg,
    right: Spacing.lg,
    alignItems: "center",
  },
  text: {
    color: Colors.light.error,
    fontSize: 16,
    fontWeight: "600",
  },
  handle: {
    position: "absolute",
    left: TRACK_PADDING,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
