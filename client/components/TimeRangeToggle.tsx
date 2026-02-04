import React from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

export type TimeRange = "week" | "month" | "year";

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const options: { label: string; value: TimeRange }[] = [
  { label: "Settimana", value: "week" },
  { label: "Mese", value: "month" },
  { label: "Anno", value: "year" },
];

const electricCyan = "#00E5FF";
const midnightIndigo = "#1A1458";
const creamySand = "#FFF3D6";

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
};

export function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  const animatedIndex = useSharedValue(options.findIndex((o) => o.value === value));

  React.useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    animatedIndex.value = withSpring(idx, springConfig);
  }, [value, animatedIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animatedIndex.value * 100 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={styles.option}
            onPress={() => onChange(option.value)}
            testID={`toggle-${option.value}`}
          >
            <ThemedText
              type="small"
              style={[
                styles.optionText,
                isActive ? styles.optionTextActive : styles.optionTextInactive,
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: BorderRadius.sm,
    padding: 4,
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: midnightIndigo,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  indicator: {
    position: "absolute",
    width: 100,
    height: "100%",
    backgroundColor: electricCyan,
    borderRadius: BorderRadius.sm - 2,
    top: 4,
    left: 4,
    ...Platform.select({
      ios: {
        shadowColor: electricCyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
    }),
  },
  option: {
    width: 100,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  optionText: {
    fontWeight: "600",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
  optionTextInactive: {
    color: midnightIndigo,
    opacity: 0.6,
  },
});
