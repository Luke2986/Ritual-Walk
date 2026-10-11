import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { toLocalDateKey } from "@shared/dates";
import { getBadge, type BadgeKey } from "@shared/badges";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { NeonInput } from "@/components/NeonInput";
import { NeonButton } from "@/components/NeonButton";
import { TogetherToggle } from "@/components/walk/TogetherToggle";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/query-client";
import { invalidateBadges } from "@/lib/badgesQuery";
import { BorderRadius, Colors, PersonColors, Spacing } from "@/constants/theme";

const DAYS_BACK = 7;

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

// The last week, newest first: "Oggi", "Ieri", "gio 8"…
function recentDays() {
  return Array.from({ length: DAYS_BACK }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const label =
      offset === 0
        ? "Oggi"
        : offset === 1
          ? "Ieri"
          : date.toLocaleDateString("it-IT", {
              weekday: "short",
              day: "numeric",
            });
    return { key: toLocalDateKey(date), date, label };
  });
}

// "2,5" and "2.5" are both fine.
const parseNumber = (text: string) => Number(text.trim().replace(",", "."));

export default function AddWalkScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { partner, refreshUser } = useAuth();

  const days = useMemo(recentDays, []);
  const [dayKey, setDayKey] = useState(days[0].key);
  const [minutes, setMinutes] = useState("");
  const [km, setKm] = useState("");
  const [together, setTogether] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const distanceKm = parseNumber(km);
    const durationMinutes = parseNumber(minutes);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 200) {
      setError("Inserisci i km percorsi, ad esempio 2,5");
      return;
    }
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 24 * 60
    ) {
      setError("Inserisci la durata in minuti, ad esempio 40");
      return;
    }

    // Today: it just ended. An earlier day: early evening, the time we'd guess.
    const durationSeconds = durationMinutes * 60;
    const day = days.find((d) => d.key === dayKey) ?? days[0];
    const startedAt =
      day.key === days[0].key
        ? new Date(Date.now() - durationSeconds * 1000)
        : new Date(
            day.date.getFullYear(),
            day.date.getMonth(),
            day.date.getDate(),
            18,
          );

    setIsSaving(true);
    setError("");
    try {
      const response = await apiRequest("POST", "/api/walks/manual", {
        distanceKm,
        durationSeconds,
        startedAt: startedAt.toISOString(),
        localDate: day.key,
        together: !!partner && together,
        note: note.trim() || null,
      });
      const body = await response.json().catch(() => null);
      const earned: BadgeKey[] = Array.isArray(body?.newBadges)
        ? body.newBadges
        : [];

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/walks/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/walks/stats"] });
      invalidateBadges();
      refreshUser().catch(() => {});

      const names = earned.flatMap((key) => getBadge(key)?.name ?? []);
      showMessage(
        "Camminata aggiunta",
        names.length > 0
          ? `Con questa avete sbloccato: ${names.join(", ")}.`
          : "La trovi nello storico.",
      );
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio non riuscito");
      setIsSaving(false);
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
        <ThemedText style={[styles.intro, { color: theme.textSecondary }]}>
          {
            "Hai camminato senza registrare, o con un'altra app? Aggiungi la camminata qui: conta per lo streak, i giorni insieme e i premi, senza mappa del percorso."
          }
        </ThemedText>

        <ThemedText
          type="small"
          style={[styles.label, { color: theme.textSecondary }]}
        >
          Giorno
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.days}
        >
          {days.map((day) => {
            const selected = day.key === dayKey;
            return (
              <Pressable
                key={day.key}
                onPress={() => setDayKey(day.key)}
                style={[
                  styles.dayChip,
                  selected
                    ? { backgroundColor: PersonColors.me }
                    : { backgroundColor: theme.cardBackground },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <ThemedText
                  style={[styles.dayText, selected && styles.dayTextSelected]}
                >
                  {day.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.row}>
          <View style={styles.half}>
            <NeonInput
              label="Durata (minuti)"
              placeholder="40"
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              testID="input-minutes"
            />
          </View>
          <View style={styles.half}>
            <NeonInput
              label="Distanza (km)"
              placeholder="2,5"
              value={km}
              onChangeText={setKm}
              keyboardType="decimal-pad"
              testID="input-km"
            />
          </View>
        </View>

        {partner ? (
          <View style={styles.together}>
            <TogetherToggle
              partnerName={partner.nickname}
              value={together}
              onChange={setTogether}
            />
          </View>
        ) : null}

        <NeonInput
          label="Nota (facoltativa)"
          placeholder="Un ricordo di questa camminata"
          value={note}
          onChangeText={setNote}
          maxLength={200}
          testID="input-note"
        />

        {error ? (
          <ThemedText style={[styles.error, { color: Colors.light.error }]}>
            {error}
          </ThemedText>
        ) : null}

        <NeonButton
          onPress={handleSave}
          size="large"
          disabled={isSaving}
          style={styles.save}
          testID="button-save-manual-walk"
        >
          {isSaving ? "Salvataggio..." : "Aggiungi camminata"}
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
  intro: {
    fontSize: 15,
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
  },
  days: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  dayChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  half: {
    flex: 1,
  },
  together: {
    marginBottom: Spacing.lg,
  },
  error: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  save: {
    width: "100%",
    marginTop: Spacing.sm,
  },
});
