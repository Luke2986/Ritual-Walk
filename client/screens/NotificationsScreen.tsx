import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Platform,
  Linking,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { AccountStackParamList } from "@/navigation/AccountStackNavigator";

interface NotificationPrefs {
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
  reminderTime: string;
  reminderDays: number[];
  reminderMessage: string | null;
  partnerAlertsEnabled: boolean;
  badgesEnabled: boolean;
  weeklySummaryEnabled: boolean;
  weeklySummaryDay: number;
  weeklySummaryTime: string;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

type NavigationProp = NativeStackNavigationProp<AccountStackParamList>;

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

function CategoryRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
  onPress,
  disabled = false,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[styles.categoryRow, disabled && styles.categoryRowDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      <View style={[styles.categoryIcon, disabled && styles.categoryIconDisabled]}>
        <Feather name={icon as any} size={20} color={disabled ? "#999" : "#B88BFF"} />
      </View>
      <View style={styles.categoryContent}>
        <ThemedText style={[styles.categoryTitle, disabled && styles.categoryTitleDisabled]}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.categoryDescription, disabled && styles.categoryDescriptionDisabled]}>
          {description}
        </ThemedText>
      </View>
      <Switch
        value={enabled && !disabled}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: "#E0E0E0", true: "#B88BFF" }}
        thumbColor="#FFFFFF"
      />
      {onPress ? (
        <Pressable onPress={onPress} disabled={disabled} style={styles.chevronButton}>
          <Feather name="chevron-right" size={20} color={disabled ? "#CCC" : "#B88BFF"} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const [osPermission, setOsPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [refreshing, setRefreshing] = useState(false);

  const { data: prefs, isLoading, refetch } = useQuery<NotificationPrefs>({
    queryKey: ["/api/notification-prefs"],
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPrefs>) => {
      const response = await apiRequest("PUT", "/api/notification-prefs", updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-prefs"] });
    },
  });

  useEffect(() => {
    checkOsPermission();
  }, []);

  const checkOsPermission = async () => {
    if (Platform.OS === "web") {
      setOsPermission("granted");
      return;
    }
    
    const { status } = await Notifications.getPermissionsAsync();
    setOsPermission(status);
  };

  const requestOsPermission = async () => {
    if (Platform.OS === "web") {
      setOsPermission("granted");
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    setOsPermission(status);
    return status === "granted";
  };

  const openSettings = async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        Alert.alert("Errore", "Impossibile aprire le impostazioni");
      }
    }
  };

  const handleMasterToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (value) {
      if (osPermission !== "granted") {
        const granted = await requestOsPermission();
        if (!granted) {
          Alert.alert(
            "Permesso necessario",
            "Per ricevere notifiche, abilita i permessi nelle impostazioni del dispositivo.",
            [
              { text: "Annulla", style: "cancel" },
              { text: "Apri Impostazioni", onPress: openSettings },
            ]
          );
          return;
        }
      }
    }
    
    updatePrefsMutation.mutate({ notificationsEnabled: value });
  };

  const handleCategoryToggle = (field: keyof NotificationPrefs, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePrefsMutation.mutate({ [field]: value });
  };

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetch();
      await checkOsPermission();
    } catch (error) {
      if (Platform.OS === "web") {
        console.warn("Sei offline: dati non aggiornati");
      } else {
        Alert.alert("Errore", "Sei offline: dati non aggiornati");
      }
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshing]);

  const masterEnabled = prefs?.notificationsEnabled ?? false;
  const isMasterDisabled = osPermission === "denied";

  const getDayNames = (days: number[]) => {
    const names = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
    if (days.length === 7) return "Ogni giorno";
    if (days.length === 0) return "Nessun giorno";
    return days.map((d) => names[d - 1]).join(", ");
  };

  const getWeekdayName = (day: number) => {
    const names = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
    return names[day] || "";
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {osPermission === "denied" ? (
          <View style={styles.warningCard}>
            <Feather name="alert-triangle" size={24} color="#FF4D6D" />
            <View style={styles.warningContent}>
              <ThemedText style={styles.warningTitle}>
                Notifiche disabilitate
              </ThemedText>
              <ThemedText style={styles.warningText}>
                Le notifiche sono disabilitate nelle impostazioni del dispositivo.
              </ThemedText>
            </View>
            <Pressable style={styles.warningButton} onPress={openSettings}>
              <ThemedText style={styles.warningButtonText}>Apri Impostazioni</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <SectionHeader title="GENERALE" />
        <View style={styles.card}>
          <View style={styles.masterRow}>
            <View style={styles.masterIcon}>
              <Feather name="bell" size={24} color="#B88BFF" />
            </View>
            <View style={styles.masterContent}>
              <ThemedText style={styles.masterTitle}>Abilita notifiche</ThemedText>
              <ThemedText style={styles.masterDescription}>
                {osPermission === "granted" 
                  ? (masterEnabled ? "Notifiche attive" : "Notifiche disattivate")
                  : "Permesso non concesso"}
              </ThemedText>
            </View>
            <Switch
              value={masterEnabled}
              onValueChange={handleMasterToggle}
              disabled={isMasterDisabled}
              trackColor={{ false: "#E0E0E0", true: "#B88BFF" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <SectionHeader title="CATEGORIE" />
        <View style={styles.card}>
          <CategoryRow
            icon="clock"
            title="Promemoria camminata"
            description={
              prefs?.remindersEnabled
                ? `${prefs.reminderTime} - ${getDayNames(prefs.reminderDays || [])}`
                : "Disattivato"
            }
            enabled={prefs?.remindersEnabled ?? true}
            onToggle={(v) => handleCategoryToggle("remindersEnabled", v)}
            onPress={() => navigation.navigate("ReminderSettings" as any)}
            disabled={!masterEnabled}
          />

          <View style={styles.divider} />

          <CategoryRow
            icon="users"
            title="Avvisi partner"
            description={prefs?.partnerAlertsEnabled ? "Attivi" : "Disattivati"}
            enabled={prefs?.partnerAlertsEnabled ?? true}
            onToggle={(v) => handleCategoryToggle("partnerAlertsEnabled", v)}
            disabled={!masterEnabled}
          />

          <View style={styles.divider} />

          <CategoryRow
            icon="award"
            title="Streak e badge"
            description={prefs?.badgesEnabled ? "Attivi" : "Disattivati"}
            enabled={prefs?.badgesEnabled ?? true}
            onToggle={(v) => handleCategoryToggle("badgesEnabled", v)}
            disabled={!masterEnabled}
          />

          <View style={styles.divider} />

          <CategoryRow
            icon="calendar"
            title="Riepilogo settimanale"
            description={
              prefs?.weeklySummaryEnabled
                ? `${getWeekdayName(prefs.weeklySummaryDay)} alle ${prefs.weeklySummaryTime}`
                : "Disattivato"
            }
            enabled={prefs?.weeklySummaryEnabled ?? true}
            onToggle={(v) => handleCategoryToggle("weeklySummaryEnabled", v)}
            onPress={() => navigation.navigate("WeeklySummarySettings" as any)}
            disabled={!masterEnabled}
          />
        </View>

        <SectionHeader title="ORE SILENZIOSE" />
        <View style={styles.card}>
          <CategoryRow
            icon="moon"
            title="Ore silenziose"
            description={
              prefs?.quietHoursEnabled
                ? `${prefs.quietStart} - ${prefs.quietEnd}`
                : "Disattivate"
            }
            enabled={prefs?.quietHoursEnabled ?? false}
            onToggle={(v) => handleCategoryToggle("quietHoursEnabled", v)}
            onPress={() => navigation.navigate("QuietHoursSettings" as any)}
            disabled={!masterEnabled}
          />
        </View>
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
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(184, 139, 255, 0.2)",
    overflow: "hidden",
  },
  warningCard: {
    backgroundColor: "rgba(255, 77, 109, 0.1)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: "column",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 77, 109, 0.3)",
  },
  warningContent: {
    alignItems: "center",
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF4D6D",
    marginBottom: Spacing.xs,
  },
  warningText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  warningButton: {
    backgroundColor: "#FF4D6D",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  warningButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  masterRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  masterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(184, 139, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  masterContent: {
    flex: 1,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  masterDescription: {
    fontSize: 13,
    color: "#666",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  categoryRowDisabled: {
    opacity: 0.5,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(184, 139, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  categoryIconDisabled: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  categoryTitleDisabled: {
    color: "#999",
  },
  categoryDescription: {
    fontSize: 12,
    color: "#666",
  },
  categoryDescriptionDisabled: {
    color: "#BBB",
  },
  chevronButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(184, 139, 255, 0.1)",
    marginHorizontal: Spacing.lg,
  },
});
