import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getBadge, type BadgeKey } from "@shared/badges";
import { ThemedText } from "@/components/ThemedText";
import { NeonButton } from "@/components/NeonButton";
import { BadgeIcon } from "@/components/BadgeIcon";
import { useTheme } from "@/hooks/useTheme";
import { MAX_APP_WIDTH } from "@/hooks/useAppWidth";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface WalkSummarySheetProps {
  visible: boolean;
  steps: number;
  distanceKm: number;
  durationFormatted: string;
  isSaving: boolean;
  error: string | null;
  onConfirm: () => void;
  onDiscard: () => void;
  // After saving: badges just earned. When there are some, the sheet shows them instead.
  newBadges: BadgeKey[];
  onShowBadges: () => void;
  onCloseBadges: () => void;
}

export function WalkSummarySheet({
  visible,
  steps,
  distanceKm,
  durationFormatted,
  isSaving,
  error,
  onConfirm,
  onDiscard,
  newBadges,
  onShowBadges,
  onCloseBadges,
}: WalkSummarySheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const earned = newBadges.flatMap((key) => getBadge(key) ?? []);
  const celebrating = earned.length > 0;

  React.useEffect(() => {
    if (celebrating) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
  }, [celebrating]);

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(2)} km`;
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    onConfirm();
  };

  const handleDiscard = () => {
    const message = "La camminata verrà eliminata e non conterà per lo streak.";
    if (Platform.OS === "web") {
      if (window.confirm(message)) onDiscard();
      return;
    }
    Alert.alert("Eliminare la camminata?", message, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: onDiscard },
    ]);
  };

  return (
    <Modal
      visible={visible || celebrating}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={celebrating ? onCloseBadges : () => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.handle} />

          {celebrating ? (
            <>
              <View style={styles.header}>
                <ThemedText type="h3" style={styles.title}>
                  {earned.length === 1 ? "Nuovo premio!" : "Nuovi premi!"}
                </ThemedText>
                <ThemedText
                  style={[styles.subtitle, { color: theme.textSecondary }]}
                >
                  Camminata salvata. Con questa avete sbloccato:
                </ThemedText>
              </View>

              <View style={styles.badgeRow}>
                {earned.map((badge) => (
                  <View key={badge.key} style={styles.badgeItem}>
                    <BadgeIcon icon={badge.icon} earned size={64} />
                    <ThemedText style={styles.badgeName} numberOfLines={2}>
                      {badge.name}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                <NeonButton
                  onPress={onShowBadges}
                  size="large"
                  style={styles.confirmButton}
                >
                  Vedi i premi
                </NeonButton>
                <Pressable onPress={onCloseBadges} style={styles.dismissButton}>
                  <ThemedText
                    style={[styles.dismissText, { color: theme.textSecondary }]}
                  >
                    Chiudi
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <View
                  style={[
                    styles.celebrationIcon,
                    { backgroundColor: `${Colors.light.success}20` },
                  ]}
                >
                  <Feather
                    name="check-circle"
                    size={40}
                    color={Colors.light.success}
                  />
                </View>
                <ThemedText type="h3" style={styles.title}>
                  Bel rituale!
                </ThemedText>
                <ThemedText
                  style={[styles.subtitle, { color: theme.textSecondary }]}
                >
                  Ecco il riepilogo della tua camminata
                </ThemedText>
              </View>

              <View style={styles.statsGrid}>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <Feather
                    name="activity"
                    size={24}
                    color={Colors.light.accentCyan}
                  />
                  <ThemedText style={styles.statValue}>
                    {steps.toLocaleString("it-IT")}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Passi
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <Feather
                    name="map-pin"
                    size={24}
                    color={Colors.light.secondary}
                  />
                  <ThemedText style={styles.statValue}>
                    {formatDistance(distanceKm)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Distanza
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <Feather
                    name="clock"
                    size={24}
                    color={Colors.light.accentMagenta}
                  />
                  <ThemedText style={styles.statValue}>
                    {durationFormatted}
                  </ThemedText>
                  <ThemedText
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Tempo
                  </ThemedText>
                </View>
              </View>

              {error ? (
                <ThemedText style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </ThemedText>
              ) : null}

              <View style={styles.actions}>
                <NeonButton
                  onPress={handleConfirm}
                  size="large"
                  style={styles.confirmButton}
                  disabled={isSaving}
                  testID="button-save-walk"
                >
                  {isSaving
                    ? "Salvataggio..."
                    : error
                      ? "Riprova"
                      : "Salva nel Diario"}
                </NeonButton>
                <Pressable
                  onPress={handleDiscard}
                  disabled={isSaving}
                  style={styles.dismissButton}
                  testID="button-dismiss-summary"
                >
                  <ThemedText
                    style={[styles.dismissText, { color: theme.textSecondary }]}
                  >
                    Annulla senza salvare
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    width: "100%",
    maxWidth: MAX_APP_WIDTH,
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
    textAlign: "center",
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  badgeItem: {
    width: 96,
    alignItems: "center",
  },
  badgeName: {
    marginTop: Spacing.sm,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
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
