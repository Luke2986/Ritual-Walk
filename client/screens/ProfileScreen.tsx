import React, { useState } from "react";
import { StyleSheet, View, Image, Alert, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { NeonCard } from "@/components/NeonCard";
import { NeonButton } from "@/components/NeonButton";
import { NeonInput } from "@/components/NeonInput";
import { StatCard } from "@/components/StatCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, couple, partner, logout, createCouple, joinCouple, refreshUser } = useAuth();

  const [ritualCodeInput, setRitualCodeInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleCreateCouple = async () => {
    setIsCreating(true);
    setError("");
    try {
      const code = await createCouple();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Ritual Code Creato!",
        `Il tuo Ritual Code e: ${code}\n\nCondividilo con il tuo partner per collegare i vostri account.`,
        [
          {
            text: "Copia",
            onPress: async () => {
              await Clipboard.setStringAsync(code);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            },
          },
          { text: "OK" },
        ]
      );
    } catch (err: any) {
      setError(err.message || "Errore nella creazione");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinCouple = async () => {
    if (ritualCodeInput.length !== 8) {
      setError("Il Ritual Code deve avere 8 caratteri");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsJoining(true);
    setError("");
    try {
      await joinCouple(ritualCodeInput.toUpperCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRitualCodeInput("");
    } catch (err: any) {
      setError(err.message || "Errore nel collegamento");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleShareCode = async () => {
    if (!couple?.ritualCode) return;
    try {
      await Share.share({
        message: `Unisciti al mio Step Ritual!\n\nUsa questo Ritual Code per collegarci: ${couple.ritualCode}\n\nScarica Step Ritual e iniziamo a camminare insieme!`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleLogout = () => {
    Alert.alert("Esci", "Sei sicuro di voler uscire?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Esci",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <KeyboardAwareScrollViewCompat
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.avatarText}>
              {user?.nickname?.charAt(0).toUpperCase() || "U"}
            </ThemedText>
          </View>
          <ThemedText type="h3" style={styles.nickname}>
            {user?.nickname}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {user?.email}
          </ThemedText>
        </View>

        {couple ? (
          <>
            <NeonCard
              title="Il Vostro Rituale"
              glowColor={theme.secondary}
              style={styles.coupleCard}
            >
              <View style={styles.coupleContent}>
                <View style={styles.partnerInfo}>
                  <View style={[styles.partnerAvatar, { backgroundColor: theme.secondary }]}>
                    <Feather name="heart" size={20} color={theme.buttonText} />
                  </View>
                  <View>
                    <ThemedText type="body">
                      {partner?.nickname || "In attesa del partner..."}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {partner ? "Collegato" : "Non ancora collegato"}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.codeContainer}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Ritual Code
                  </ThemedText>
                  <ThemedText style={styles.ritualCode}>{couple.ritualCode}</ThemedText>
                </View>

                <NeonButton
                  variant="outline"
                  onPress={handleShareCode}
                  style={styles.shareButton}
                >
                  Condividi Codice
                </NeonButton>
              </View>
            </NeonCard>

            <View style={styles.statsRow}>
              <StatCard
                label="Km Totali"
                value={couple.totalKm.toFixed(1)}
                icon="map"
                color={theme.primary}
              />
              <View style={{ width: Spacing.md }} />
              <StatCard
                label="Streak"
                value={`${couple.currentStreak} gg`}
                icon="zap"
                color={Colors.dark.warning}
              />
            </View>
          </>
        ) : (
          <NeonCard
            title="Collega il Partner"
            style={styles.connectCard}
            variant="highlight"
          >
            <ThemedText
              type="body"
              style={[styles.connectDescription, { color: theme.textSecondary }]}
            >
              Crea un nuovo Ritual Code o inserisci quello del tuo partner per iniziare insieme
            </ThemedText>

            <NeonButton
              onPress={handleCreateCouple}
              disabled={isCreating}
              style={styles.createButton}
            >
              {isCreating ? "Creazione..." : "Crea Nuovo Ritual Code"}
            </NeonButton>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.textSecondary }]} />
              <ThemedText type="small" style={[styles.dividerText, { color: theme.textSecondary }]}>
                oppure
              </ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: theme.textSecondary }]} />
            </View>

            <NeonInput
              label="Ritual Code del Partner"
              placeholder="Inserisci il codice a 8 caratteri"
              value={ritualCodeInput}
              onChangeText={(text) => setRitualCodeInput(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />

            {error ? (
              <ThemedText type="small" style={[styles.error, { color: Colors.dark.error }]}>
                {error}
              </ThemedText>
            ) : null}

            <NeonButton
              variant="secondary"
              onPress={handleJoinCouple}
              disabled={isJoining || ritualCodeInput.length !== 8}
            >
              {isJoining ? "Collegamento..." : "Collega Partner"}
            </NeonButton>
          </NeonCard>
        )}

        <NeonButton
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Esci
        </NeonButton>
      </KeyboardAwareScrollViewCompat>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.buttonText,
  },
  nickname: {
    marginBottom: Spacing.xs,
  },
  coupleCard: {
    marginBottom: Spacing.lg,
  },
  coupleContent: {
    marginTop: Spacing.md,
  },
  partnerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  codeContainer: {
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  ritualCode: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: Spacing.xs,
  },
  shareButton: {
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
  },
  connectCard: {
    marginBottom: Spacing.xl,
  },
  connectDescription: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  createButton: {
    marginBottom: Spacing.lg,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
  },
  error: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  logoutButton: {
    marginTop: Spacing.lg,
  },
});
