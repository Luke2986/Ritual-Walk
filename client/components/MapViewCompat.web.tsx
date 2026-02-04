import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface MapViewCompatProps {
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  children?: React.ReactNode;
  mapRef?: React.Ref<any>;
}

interface PolylineProps {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
}

interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  pinColor?: string;
}

export function MapViewCompat({ style }: MapViewCompatProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.webMapPlaceholder, { backgroundColor: theme.backgroundSecondary }, style]}>
      <Feather name="map" size={48} color={theme.textSecondary} />
      <ThemedText type="body" style={[styles.webMapText, { color: theme.textSecondary }]}>
        Mappa disponibile su Expo Go
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
        Scansiona il QR code per testare su dispositivo mobile
      </ThemedText>
    </View>
  );
}

export function PolylineCompat(_props: PolylineProps) {
  return null;
}

export function MarkerCompat(_props: MarkerProps) {
  return null;
}

const styles = StyleSheet.create({
  webMapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  webMapText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
