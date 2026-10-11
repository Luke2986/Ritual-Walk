import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet } from "react-native";
import * as Location from "expo-location";

import {
  MapViewCompat,
  PolylineCompat,
  MarkerCompat,
} from "@/components/MapViewCompat";
import { Colors } from "@/constants/theme";
import type { LatLng } from "@/lib/tracking";

const ZOOM = { latitudeDelta: 0.004, longitudeDelta: 0.004 };

export function LiveRouteMap({ points }: { points: LatLng[] }) {
  const mapRef = useRef<any>(null);
  const last = points[points.length - 1];
  const hasPoints = points.length > 0;

  useEffect(() => {
    if (!last) return;
    mapRef.current?.animateToRegion?.(
      { latitude: last.latitude, longitude: last.longitude, ...ZOOM },
      600,
    );
  }, [last]);

  // Centre on the user before the first filtered fix arrives.
  useEffect(() => {
    if (hasPoints || Platform.OS === "web") return;
    Location.getLastKnownPositionAsync()
      .then((position) => {
        if (!position) return;
        mapRef.current?.animateToRegion?.(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            ...ZOOM,
          },
          0,
        );
      })
      .catch(() => {});
  }, [hasPoints]);

  return (
    <MapViewCompat
      mapRef={mapRef}
      style={StyleSheet.absoluteFill}
      showsUserLocation
      initialRegion={
        last
          ? { latitude: last.latitude, longitude: last.longitude, ...ZOOM }
          : undefined
      }
    >
      {points.length > 1 ? (
        <PolylineCompat
          coordinates={points}
          strokeColor={Colors.light.accentMagenta}
          strokeWidth={5}
        />
      ) : null}
      {points[0] ? (
        <MarkerCompat
          coordinate={points[0]}
          title="Partenza"
          pinColor={Colors.light.success}
        />
      ) : null}
    </MapViewCompat>
  );
}
