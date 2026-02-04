import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { NeonButton } from "@/components/NeonButton";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface WalkSummarySheetProps {
  visible: boolean;
  steps: number;
  distanceKm: number;
  durationFormatted: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function WalkSummarySheet({
  visible,
  steps,
  distanceKm,
  durationFormatted,
  onConfirm,
  onDismiss,
}: WalkSummarySheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(2)} km`;
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View 
          style={[
            styles.sheet, 
            { 
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            }
          ]}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View style={[styles.celebrationIcon, { backgroundColor: `${Colors.light.success}20` }]}>
              <Feather name="check-circle" size={40} color={Colors.light.success} />
            </View>
            <ThemedText type="h3" style={styles.title}>
              Bel rituale!
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Ecco il riepilogo della tua camminata
            </ThemedText>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="activity" size={24} color={Colors.light.accentCyan} />
              <ThemedText style={styles.statValue}>{steps.toLocaleString("it-IT")}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Passi</ThemedText>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="map-pin" size={24} color={Colors.light.secondary} />
              <ThemedText style={styles.statValue}>{formatDistance(distanceKm)}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Distanza</ThemedText>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
              <Feather name="clock" size={24} color={Colors.light.accentMagenta} />
              <ThemedText style={styles.statValue}>{durationFormatted}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Tempo</ThemedText>
            </View>
          </View>

          <View style={styles.actions}>
            <NeonButton 
              onPress={handleConfirm} 
              size="large" 
              style={styles.confirmButton}
              testID="button-save-walk"
            >
              Salva nel Diario
            </NeonButton>
            <Pressable 
              onPress={onDismiss} 
              style={styles.dismissButton}
              testID="button-dismiss-summary"
            >
              <ThemedText style={[styles.dismissText, { color: theme.textSecondary }]}>
                Annulla senza salvare
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    ...Shadows.cardElevated,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.card,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actions: {
    gap: Spacing.md,
  },
  confirmButton: {
    width: "100%",
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  dismissText: {
    fontSize: 14,
  },
});
