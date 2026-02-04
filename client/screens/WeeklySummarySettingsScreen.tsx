import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface NotificationPrefs {
  weeklySummaryDay: number;
  weeklySummaryTime: string;
}

const DAYS = [
  { id: 1, name: "Lunedì" },
  { id: 2, name: "Martedì" },
  { id: 3, name: "Mercoledì" },
  { id: 4, name: "Giovedì" },
  { id: 5, name: "Venerdì" },
  { id: 6, name: "Sabato" },
  { id: 7, name: "Domenica" },
];

export default function WeeklySummarySettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(7);

  const { data: prefs } = useQuery<NotificationPrefs>({
    queryKey: ["/api/notification-prefs"],
  });

  useEffect(() => {
    if (prefs) {
      const [hours, minutes] = (prefs.weeklySummaryTime || "10:00").split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      setSelectedTime(date);
      setSelectedDay(prefs.weeklySummaryDay || 7);
    }
  }, [prefs]);

  const updatePrefsMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPrefs>) => {
      const response = await apiRequest("PUT", "/api/notification-prefs", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-prefs"] });
      Alert.alert("Salvato", "Impostazioni aggiornate");
    },
    onError: () => {
      Alert.alert("Errore", "Impossibile salvare le impostazioni");
    },
  });

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hours = selectedTime.getHours().toString().padStart(2, "0");
    const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
    updatePrefsMutation.mutate({
      weeklySummaryDay: selectedDay,
      weeklySummaryTime: `${hours}:${minutes}`,
    });
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <ThemedText style={styles.label}>Giorno della settimana</ThemedText>
          {DAYS.map((day) => (
            <Pressable
              key={day.id}
              style={[
                styles.dayRow,
                selectedDay === day.id && styles.dayRowActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDay(day.id);
              }}
            >
              <ThemedText
                style={[
                  styles.dayName,
                  selectedDay === day.id && styles.dayNameActive,
                ]}
              >
                {day.name}
              </ThemedText>
              {selectedDay === day.id ? (
                <Feather name="check" size={20} color="#FFFFFF" />
              ) : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.label}>Orario</ThemedText>
          <Pressable
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Feather name="clock" size={20} color="#B88BFF" />
            <ThemedText style={styles.timeText}>{formatTime(selectedTime)}</ThemedText>
          </Pressable>

          {showTimePicker ? (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleTimeChange}
            />
          ) : null}
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <LinearGradient
            colors={["#B88BFF", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveGradient}
          >
            <ThemedText style={styles.saveText}>Salva</ThemedText>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(184, 139, 255, 0.2)",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: Spacing.md,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  dayRowActive: {
    backgroundColor: "#B88BFF",
  },
  dayName: {
    fontSize: 15,
    color: "#1A1A2E",
  },
  dayNameActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(184, 139, 255, 0.1)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  timeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
  saveGradient: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
