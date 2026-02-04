import React from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Caricamento..." }: LoadingScreenProps) {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.container}
    >
      <ActivityIndicator size="large" color={theme.primary} />
      <ThemedText type="body" style={styles.message}>
        {message}
      </ThemedText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    marginTop: 16,
    opacity: 0.7,
  },
});
