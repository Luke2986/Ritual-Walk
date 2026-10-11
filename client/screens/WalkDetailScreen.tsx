import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useNavigation } from "@react-navigation/native";

import {
  MapViewCompat,
  PolylineCompat,
  MarkerCompat,
} from "@/components/MapViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { invalidateBadges } from "@/lib/badgesQuery";
import { confirmDestructive } from "@/lib/confirm";

type WalkDetailScreenProps = {
  route: RouteProp<{ WalkDetail: { walkId: string } }, "WalkDetail">;
};

interface WalkDetail {
  id: string;
  userId: string;
  distanceKm: number;
  durationSeconds: number;
  startedAt: string;
  endedAt: string | null;
  pathJson: { latitude: number; longitude: number }[] | null;
  userNickname: string;
}

export default function WalkDetailScreen({ route }: WalkDetailScreenProps) {
  const { walkId } = route.params;
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: walk,
    isLoading,
    isError,
  } = useQuery<WalkDetail>({
    queryKey: ["/api/walks", walkId],
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMapRegion = (path: { latitude: number; longitude: number }[]) => {
    const lats = path.map((p) => p.latitude);
    const lngs = path.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.005),
      longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.005),
    };
  };

  const handleDelete = async () => {
    const confirmed = await confirmDestructive(
      "Eliminare la camminata?",
      "I km verranno tolti dal totale condiviso e lo streak verrà ricalcolato.",
      "Elimina",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/walks/${walkId}`);
    } catch (error) {
      setIsDeleting(false);
      const message =
        error instanceof Error ? error.message : "Eliminazione non riuscita";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Errore", message);
      return;
    }
    navigation.goBack();
    queryClient.removeQueries({ queryKey: ["/api/walks", walkId] });
    queryClient.invalidateQueries({ queryKey: ["/api/walks/recent"] });
    queryClient.invalidateQueries({ queryKey: ["/api/walks/stats"] });
    invalidateBadges();
    refreshUser().catch(() => {});
  };

  if (isError) {
    return (
      <LinearGradient
        colors={[theme.backgroundRoot, theme.backgroundDefault]}
        style={[styles.gradient, styles.centered]}
      >
        <EmptyState
          icon="alert-circle"
          title="Camminata non disponibile"
          description="Controlla la connessione e riprova"
        />
      </LinearGradient>
    );
  }

  if (isLoading || !walk) {
    return <LoadingScreen />;
  }

  const path = walk.pathJson ?? [];

  const speed =
    walk.durationSeconds > 0
      ? (walk.distanceKm / walk.durationSeconds) * 3600
      : 0;

  return (
    <LinearGradient
      colors={[theme.backgroundRoot, theme.backgroundDefault]}
      style={styles.gradient}
    >
      <ScrollView
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
        <View style={styles.header}>
          <ThemedText type="h3">{walk.userNickname}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatDate(walk.startedAt)}
          </ThemedText>
        </View>

        <View style={styles.mapContainer}>
          {path.length > 1 ? (
            <MapViewCompat
              style={styles.map}
              initialRegion={getMapRegion(path)}
            >
              <PolylineCompat
                coordinates={path}
                strokeColor={theme.primary}
                strokeWidth={4}
              />
              <MarkerCompat
                coordinate={path[0]}
                title="Inizio"
                pinColor={Colors.dark.success}
              />
              <MarkerCompat
                coordinate={path[path.length - 1]}
                title="Fine"
                pinColor={Colors.dark.error}
              />
            </MapViewCompat>
          ) : (
            <View
              style={[
                styles.noPath,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="map" size={36} color={theme.textSecondary} />
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
              >
                Percorso GPS non disponibile per questa camminata
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              label="Distanza"
              value={`${walk.distanceKm.toFixed(2)} km`}
              icon="map-pin"
              color={theme.primary}
            />
            <View style={{ width: Spacing.md }} />
            <StatCard
              label="Durata"
              value={formatDuration(walk.durationSeconds)}
              icon="clock"
              color={theme.secondary}
            />
          </View>
          <View style={[styles.statsRow, { marginTop: Spacing.md }]}>
            <StatCard
              label="Velocita Media"
              value={`${speed.toFixed(1)} km/h`}
              icon="trending-up"
              color={theme.accent}
            />
            <View style={{ width: Spacing.md }} />
            <StatCard
              label="Passo"
              value={
                walk.distanceKm > 0
                  ? `${(walk.durationSeconds / 60 / walk.distanceKm).toFixed(1)} min/km`
                  : "0 min/km"
              }
              icon="activity"
              color={Colors.dark.success}
            />
          </View>
        </View>

        {walk.userId === user?.id ? (
          <Pressable
            style={[styles.deleteButton, isDeleting && styles.deleteDisabled]}
            onPress={handleDelete}
            disabled={isDeleting}
            testID="button-delete-walk"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={Colors.light.error} />
            ) : (
              <>
                <Feather name="trash-2" size={18} color={Colors.light.error} />
                <ThemedText style={styles.deleteText}>
                  Elimina camminata
                </ThemedText>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  noPath: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  mapContainer: {
    height: 250,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  map: {
    flex: 1,
  },
  statsGrid: {},
  statsRow: {
    flexDirection: "row",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.4)",
  },
  deleteDisabled: {
    opacity: 0.6,
  },
  deleteText: {
    color: Colors.light.error,
    fontWeight: "600",
  },
});
