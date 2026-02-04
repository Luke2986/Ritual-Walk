import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, View } from "react-native";
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
import { BorderRadius, Spacing, Colors } from "@/constants/theme";

interface NeonButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline";
  size?: "default" | "large" | "small";
  testID?: string;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NeonButton({
  onPress,
  children,
  style,
  disabled = false,
  variant = "primary",
  size = "default",
  testID,
}: NeonButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.96, springConfig);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "large":
        return { height: 60, paddingHorizontal: Spacing["3xl"] };
      case "small":
        return { height: 44, paddingHorizontal: Spacing.lg };
      default:
        return { height: Spacing.buttonHeight, paddingHorizontal: Spacing["2xl"] };
    }
  };

  const getVariantContent = () => {
    const textColor = variant === "outline" ? theme.primary : theme.buttonText;

    if (variant === "outline") {
      return (
        <View
          style={[
            styles.button,
            getSizeStyles(),
            styles.outlineButton,
            { borderColor: theme.primary },
            disabled && styles.disabled,
          ]}
        >
          <ThemedText
            type="body"
            style={[styles.buttonText, { color: textColor }]}
          >
            {children}
          </ThemedText>
        </View>
      );
    }

    const gradientColors = variant === "secondary"
      ? [Colors.light.secondary, Colors.light.accent] as const
      : [Colors.light.primary, Colors.light.accent] as const;

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.button,
          getSizeStyles(),
          disabled && styles.disabled,
        ]}
      >
        <ThemedText
          type="body"
          style={[styles.buttonText, { color: textColor }]}
        >
          {children}
        </ThemedText>
      </LinearGradient>
    );
  };

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.wrapper, style, animatedStyle]}
      testID={testID}
    >
      {getVariantContent()}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  button: {
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  buttonText: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
});
