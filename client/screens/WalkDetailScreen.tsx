import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
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
import { NeonInput } from "@/components/NeonInput";
import { NeonButton } from "@/components/NeonButton";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { invalidateBadges } from "@/lib/badgesQuery";
import { confirmDestructive } from "@/lib/confirm";
import { formatDecimal, formatPace } from "@/lib/formatDistance";

type WalkDetailScreenProps = {
  route: RouteProp<{ WalkDetail: { walkId: string } }, "WalkDetail">;
};

interface WalkDetail {
  id: string;
  userId: string;
  distanceKm: number;
  durationSeconds: number;
  stepsTotal: number | null;
  startedAt: string;
  endedAt: string | null;
  pathJson: { latitude: number; longitude: number }[] | null;
  userNickname: string;
  together: boolean;
  companionNickname: string | null;
  manual: boolean;
  note: string | null;
}

// The owner can write a line to remember the walk by; the other person reads it.
function WalkNote({
  walkId,
  note,
  editable,
}: {
  walkId: string;
  note: string | null;
  editable: boolean;
}) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setDraft(note ?? ""), [note]);

  if (!editable) {
    return note ? (
      <View
        style={[styles.noteCard, { backgroundColor: theme.cardBackground }]}
      >
        <ThemedText style={[styles.noteLabel, { color: theme.textSecondary }]}>
          NOTA
        </ThemedText>
        <ThemedText>{note}</ThemedText>
      </View>
    ) : null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      await apiRequest("PUT", `/api/walks/${walkId}/note`, { note: draft });
      await queryClient.invalidateQueries({ queryKey: ["/api/walks", walkId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio non riuscito");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.noteSection}>
      <NeonInput
        label="Nota"
        placeholder="Un ricordo di questa camminata"
        value={draft}
        onChangeText={setDraft}
        maxLength={200}
        error={error || undefined}
        testID="input-walk-note"
      />
      {draft.trim() !== (note ?? "") ? (
        <NeonButton onPress={handleSave} disabled={isSaving} size="small">
          {isSaving ? "Salvataggio..." : "Salva nota"}
        </NeonButton>
      ) : null}
    </View>
  );
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
  const kind =
    walk.together && walk.manual
      ? "Camminata insieme, aggiunta a mano"
      : walk.together
        ? "Camminata insieme"
        : walk.manual
          ? "Aggiunta a mano"
          : null;

  const speed =
    walk.durationSeconds > 0
      ? (walk.distanceKm / walk.durationSeconds) * 3600
      : 0;

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
        <View style={styles.header}>
          <ThemedText type="h3">
            {walk.together && walk.companionNickname
              ? `${walk.userNickname} e ${walk.companionNickname}`
              : walk.userNickname}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatDate(walk.startedAt)}
          </ThemedText>
          {kind ? (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {kind}
            </ThemedText>
          ) : null}
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
                {walk.manual
                  ? "Camminata aggiunta a mano, senza percorso"
                  : "Percorso GPS non disponibile per questa camminata"}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              label="Distanza"
              value={`${formatDecimal(walk.distanceKm, 2)} km`}
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
              label="Velocità media"
              value={`${formatDecimal(speed, 1)} km/h`}
              icon="trending-up"
              color={theme.accent}
            />
            <View style={{ width: Spacing.md }} />
            <StatCard
              label="Passo al km"
              value={formatPace(walk.durationSeconds, walk.distanceKm)}
              icon="watch"
              color={Colors.dark.success}
            />
          </View>
          {walk.stepsTotal ? (
            <View style={[styles.statsRow, { marginTop: Spacing.md }]}>
              <StatCard
                label="Passi"
                value={walk.stepsTotal.toLocaleString("it-IT")}
                icon="activity"
                color={theme.secondary}
              />
            </View>
          ) : null}
        </View>

        <WalkNote
          walkId={walk.id}
          note={walk.note}
          editable={walk.userId === user?.id}
        />

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
      </KeyboardAwareScrollViewCompat>
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
  noteSection: {
    marginTop: Spacing.xl,
  },
  noteCard: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  noteLabel: {
    fontSize: 11,
    letterSpacing: 1,
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
