import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { NeonButton } from "@/components/NeonButton";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
        <Feather name={icon} size={48} color={theme.primary} />
      </View>
      <ThemedText type="h4" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
        {description}
      </ThemedText>
      {actionLabel && onAction ? (
        <NeonButton onPress={onAction} style={styles.button}>
          {actionLabel}
        </NeonButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  button: {
    minWidth: 200,
  },
});
