import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { RouteProp } from "@react-navigation/native";

import { MapViewCompat, PolylineCompat, MarkerCompat } from "@/components/MapViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors, BorderRadius } from "@/constants/theme";
import { HistoryStackParamList } from "@/navigation/HistoryStackNavigator";

type WalkDetailScreenProps = {
  route: RouteProp<HistoryStackParamList, "WalkDetail">;
};

interface WalkDetail {
  id: string;
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
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const { data: walk, isLoading } = useQuery<WalkDetail>({
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

  const getMapRegion = () => {
    if (!walk?.pathJson || walk.pathJson.length === 0) {
      return {
        latitude: 41.9028,
        longitude: 12.4964,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const lats = walk.pathJson.map((p) => p.latitude);
    const lngs = walk.pathJson.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.01,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.01,
    };
  };

  if (isLoading || !walk) {
    return <LoadingScreen />;
  }

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
            paddingBottom: insets.bottom + Spacing.xl,
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
          <MapViewCompat
            style={styles.map}
            initialRegion={getMapRegion()}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {walk.pathJson && walk.pathJson.length > 1 ? (
              <>
                <PolylineCompat
                  coordinates={walk.pathJson}
                  strokeColor={theme.primary}
                  strokeWidth={4}
                />
                <MarkerCompat
                  coordinate={walk.pathJson[0]}
                  title="Inizio"
                  pinColor={Colors.dark.success}
                />
                <MarkerCompat
                  coordinate={walk.pathJson[walk.pathJson.length - 1]}
                  title="Fine"
                  pinColor={Colors.dark.error}
                />
              </>
            ) : null}
          </MapViewCompat>
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
                  ? `${((walk.durationSeconds / 60) / walk.distanceKm).toFixed(1)} min/km`
                  : "0 min/km"
              }
              icon="activity"
              color={Colors.dark.success}
            />
          </View>
        </View>
      </ScrollView>
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
});
