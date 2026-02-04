import React, { useState } from "react";
import { StyleSheet, TextInput, View, TextInputProps, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface NeonInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
}

export function NeonInput({
  label,
  error,
  icon,
  secureTextEntry,
  ...props
}: NeonInputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderOpacity = useSharedValue(0.3);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? Colors.dark.error
      : `rgba(255, 0, 255, ${borderOpacity.value})`,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    borderOpacity.value = withSpring(0.8);
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderOpacity.value = withSpring(0.3);
  };

  const isPassword = secureTextEntry !== undefined;

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}
      <Animated.View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.backgroundDefault },
          animatedBorderStyle,
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={20}
            color={isFocused ? theme.primary : theme.textSecondary}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          style={[
            styles.input,
            { color: theme.text },
            icon ? styles.inputWithIcon : null,
            isPassword ? styles.inputWithPasswordToggle : null,
          ]}
          placeholderTextColor={theme.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <ThemedText type="small" style={[styles.error, { color: Colors.dark.error }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputWithPasswordToggle: {
    paddingRight: Spacing["2xl"],
  },
  passwordToggle: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  error: {
    marginTop: Spacing.xs,
  },
});
