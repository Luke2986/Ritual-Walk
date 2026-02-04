import React from "react";
import { StyleSheet, Pressable, ViewStyle, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface NeonCardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  glowColor?: string;
  variant?: "default" | "stat" | "highlight";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NeonCard({
  title,
  subtitle,
  children,
  onPress,
  style,
  glowColor,
  variant = "default",
}: NeonCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const color = glowColor || theme.primary;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig);
    opacity.value = withSpring(0.9, springConfig);
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
    opacity.value = withSpring(1, springConfig);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "stat":
        return {
          paddingVertical: Spacing["3xl"],
          alignItems: "center" as const,
        };
      case "highlight":
        return {
          borderWidth: 2,
          borderColor: color,
        };
      default:
        return {};
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      style={[animatedStyle]}
    >
      <View style={[styles.cardWrapper, style]}>
        <LinearGradient
          colors={[
            `${color}15`,
            `${theme.backgroundDefault}`,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            {
              borderColor: `${color}40`,
            },
            getVariantStyles(),
          ]}
        >
          {title ? (
            <ThemedText type="small" style={[styles.title, { color: theme.textSecondary }]}>
              {title}
            </ThemedText>
          ) : null}
          {subtitle ? (
            <ThemedText type="h3" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
          {children}
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  title: {
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
  },
  subtitle: {
    fontWeight: "700",
  },
});
