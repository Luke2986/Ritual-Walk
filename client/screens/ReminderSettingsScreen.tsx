import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
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
  reminderTime: string;
  reminderDays: number[];
  reminderMessage: string | null;
}

const DAYS = [
  { id: 1, short: "L", long: "Lun" },
  { id: 2, short: "M", long: "Mar" },
  { id: 3, short: "M", long: "Mer" },
  { id: 4, short: "G", long: "Gio" },
  { id: 5, short: "V", long: "Ven" },
  { id: 6, short: "S", long: "Sab" },
  { id: 7, short: "D", long: "Dom" },
];

export default function ReminderSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [message, setMessage] = useState("");

  const { data: prefs } = useQuery<NotificationPrefs>({
    queryKey: ["/api/notification-prefs"],
  });

  useEffect(() => {
    if (prefs) {
      const [hours, minutes] = (prefs.reminderTime || "18:00").split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      setSelectedTime(date);
      setSelectedDays(prefs.reminderDays || [1, 2, 3, 4, 5, 6, 7]);
      setMessage(prefs.reminderMessage || "");
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

  const toggleDay = (dayId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hours = selectedTime.getHours().toString().padStart(2, "0");
    const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
    updatePrefsMutation.mutate({
      reminderTime: `${hours}:${minutes}`,
      reminderDays: selectedDays,
      reminderMessage: message.trim() || null,
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
          <ThemedText style={styles.label}>Orario promemoria</ThemedText>
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

        <View style={styles.card}>
          <ThemedText style={styles.label}>Giorni della settimana</ThemedText>
          <View style={styles.daysRow}>
            {DAYS.map((day) => (
              <Pressable
                key={day.id}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.id) && styles.dayButtonActive,
                ]}
                onPress={() => toggleDay(day.id)}
              >
                <ThemedText
                  style={[
                    styles.dayText,
                    selectedDays.includes(day.id) && styles.dayTextActive,
                  ]}
                >
                  {day.short}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.label}>Messaggio personalizzato (opzionale)</ThemedText>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Es: È ora della passeggiata!"
            placeholderTextColor="#999"
            multiline
          />
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
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonActive: {
    backgroundColor: "#B88BFF",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  dayTextActive: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: "#1A1A2E",
    minHeight: 80,
    textAlignVertical: "top",
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
