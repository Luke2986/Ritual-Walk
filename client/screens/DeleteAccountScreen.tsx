import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { NeonInput } from "@/components/NeonInput";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { confirmDestructive } from "@/lib/confirm";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

const DELETED_DATA = [
  "il tuo account e la tua email",
  "tutte le tue camminate, con i percorsi GPS",
  "le tue impostazioni delle notifiche",
];

export default function DeleteAccountScreen() {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { partner, deleteAccount } = useAuth();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      setError("Inserisci la password per confermare");
      return;
    }
    const confirmed = await confirmDestructive(
      "Eliminare l'account?",
      "Questa operazione non si può annullare.",
      "Elimina",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError("");
    try {
      await deleteAccount(password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Eliminazione non riuscita",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsDeleting(false);
    }
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
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Feather name="alert-triangle" size={22} color="#FF2FB3" />
            <ThemedText style={styles.title}>
              Eliminazione definitiva
            </ThemedText>
          </View>
          <ThemedText style={styles.text}>Verranno cancellati:</ThemedText>
          {DELETED_DATA.map((item) => (
            <ThemedText key={item} style={styles.listItem}>
              • {item}
            </ThemedText>
          ))}
          {partner ? (
            <ThemedText style={[styles.text, styles.partnerNote]}>
              Il collegamento con {partner.nickname} verrà interrotto. Le sue
              camminate restano sul suo account.
            </ThemedText>
          ) : null}
        </View>

        <NeonInput
          label="Password"
          placeholder="La tua password"
          icon="lock"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          testID="input-delete-password"
        />

        {error ? (
          <ThemedText style={[styles.error, { color: Colors.light.error }]}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={[styles.deleteButton, isDeleting && styles.disabled]}
          onPress={handleDelete}
          disabled={isDeleting}
          testID="button-delete-account"
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="trash-2" size={18} color="#FFFFFF" />
              <ThemedText style={styles.deleteText}>
                Elimina il mio account
              </ThemedText>
            </>
          )}
        </Pressable>
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
  card: {
    backgroundColor: "rgba(255, 47, 179, 0.05)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 47, 179, 0.2)",
    marginBottom: Spacing.xl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FF2FB3",
  },
  text: {
    fontSize: 14,
    color: "#3B2F8A",
  },
  listItem: {
    fontSize: 14,
    color: "#3B2F8A",
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  partnerNote: {
    marginTop: Spacing.md,
  },
  error: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF2FB3",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  disabled: {
    opacity: 0.6,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
