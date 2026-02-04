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
  quietStart: string;
  quietEnd: string;
}

export default function QuietHoursSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const { data: prefs } = useQuery<NotificationPrefs>({
    queryKey: ["/api/notification-prefs"],
  });

  useEffect(() => {
    if (prefs) {
      const [startH, startM] = (prefs.quietStart || "22:00").split(":");
      const [endH, endM] = (prefs.quietEnd || "08:00").split(":");
      
      const start = new Date();
      start.setHours(parseInt(startH), parseInt(startM), 0, 0);
      setStartTime(start);
      
      const end = new Date();
      end.setHours(parseInt(endH), parseInt(endM), 0, 0);
      setEndTime(end);
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

  const handleStartChange = (event: any, date?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (date) {
      setStartTime(date);
    }
  };

  const handleEndChange = (event: any, date?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (date) {
      setEndTime(date);
    }
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const startH = startTime.getHours().toString().padStart(2, "0");
    const startM = startTime.getMinutes().toString().padStart(2, "0");
    const endH = endTime.getHours().toString().padStart(2, "0");
    const endM = endTime.getMinutes().toString().padStart(2, "0");
    
    updatePrefsMutation.mutate({
      quietStart: `${startH}:${startM}`,
      quietEnd: `${endH}:${endM}`,
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
        <View style={styles.infoCard}>
          <Feather name="moon" size={24} color="#B88BFF" />
          <ThemedText style={styles.infoText}>
            Durante le ore silenziose, non riceverai notifiche push. Perfetto per la notte o i momenti di concentrazione.
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.label}>Inizio ore silenziose</ThemedText>
          <Pressable
            style={styles.timeButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Feather name="moon" size={20} color="#B88BFF" />
            <ThemedText style={styles.timeText}>{formatTime(startTime)}</ThemedText>
          </Pressable>

          {showStartPicker ? (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleStartChange}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.label}>Fine ore silenziose</ThemedText>
          <Pressable
            style={styles.timeButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Feather name="sun" size={20} color="#FFE66D" />
            <ThemedText style={styles.timeText}>{formatTime(endTime)}</ThemedText>
          </Pressable>

          {showEndPicker ? (
            <DateTimePicker
              value={endTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleEndChange}
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
  infoCard: {
    backgroundColor: "rgba(184, 139, 255, 0.1)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(184, 139, 255, 0.2)",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
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
