import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface StatCardProps {
  label: string;
  value: string;
  icon?: keyof typeof Feather.glyphMap;
  color?: string;
  style?: ViewStyle;
}

export function StatCard({ label, value, icon, color, style }: StatCardProps) {
  const { theme } = useTheme();
  const accentColor = color || theme.primary;

  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={[`${accentColor}20`, theme.backgroundDefault]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderColor: `${accentColor}40` }]}
      >
        {icon ? (
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}30` }]}>
            <Feather name={icon} size={20} color={accentColor} />
          </View>
        ) : null}
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        <ThemedText style={[styles.value, { color: theme.text }]}>
          {value}
        </ThemedText>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
  },
});
