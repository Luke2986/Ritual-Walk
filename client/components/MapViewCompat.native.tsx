import React from "react";
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";

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

export function MapViewCompat({
  style,
  initialRegion,
  showsUserLocation,
  followsUserLocation,
  scrollEnabled = true,
  zoomEnabled = true,
  rotateEnabled = true,
  pitchEnabled = true,
  children,
  mapRef,
}: MapViewCompatProps) {
  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={style}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      followsUserLocation={followsUserLocation}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      rotateEnabled={rotateEnabled}
      pitchEnabled={pitchEnabled}
    >
      {children}
    </MapView>
  );
}

export function PolylineCompat({ coordinates, strokeColor, strokeWidth }: PolylineProps) {
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={strokeColor}
      strokeWidth={strokeWidth}
    />
  );
}

export function MarkerCompat({ coordinate, title, pinColor }: MarkerProps) {
  return <Marker coordinate={coordinate} title={title} pinColor={pinColor} />;
}
