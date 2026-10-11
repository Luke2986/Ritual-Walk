import React from "react";
import { StyleSheet, Switch, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, PersonColors, Spacing } from "@/constants/theme";

interface TogetherToggleProps {
  partnerName: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

// One recording for a walk done side by side: it counts for both people.
export function TogetherToggle({
  partnerName,
  value,
  onChange,
  disabled,
}: TogetherToggleProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.icon}>
        <Feather name="users" size={20} color={PersonColors.partner} />
      </View>
      <View style={styles.text}>
        <ThemedText style={styles.title}>Abbiamo camminato insieme</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Vale per te e per {partnerName}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{
          false: "rgba(59, 47, 138, 0.2)",
          true: PersonColors.partner,
        }}
        thumbColor="#FFFFFF"
        accessibilityLabel={`Abbiamo camminato insieme, vale per te e per ${partnerName}`}
        testID="switch-together"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13, 148, 136, 0.12)",
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
