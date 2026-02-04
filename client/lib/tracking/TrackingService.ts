import * as Location from "expo-location";
import { Platform, Alert, Linking } from "react-native";
import {
  setActiveWalk,
  getActiveWalk,
  clearActiveWalk,
  getTrackPoints,
  clearTrackPoints,
  updateActiveWalkPause,
  persistLocationsBatch,
  getLatestTrackPoint,
  TrackPoint,
} from "./persistence";
import { LOCATION_TASK_NAME } from "./backgroundLocationTask";

export interface TrackingStatus {
  isTracking: boolean;
  isPaused: boolean;
  walkId: string | null;
  startTime: number | null;
  pausedTime: number;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

class TrackingService {
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private isWebMode: boolean = Platform.OS === "web";

  async requestPermissions(): Promise<{ foreground: boolean; background: boolean }> {
    const foreground = await Location.requestForegroundPermissionsAsync();
    
    if (!foreground.granted) {
      return { foreground: false, background: false };
    }

    // Web doesn't support background location
    if (this.isWebMode) {
      return { foreground: true, background: false };
    }

    // iOS in Expo Go doesn't support background location - skip the request entirely
    // Background location only works with development builds or standalone apps on iOS
    if (Platform.OS === "ios") {
      console.log("iOS detected - skipping background location request (not supported in Expo Go)");
      return { foreground: true, background: false };
    }

    // Android supports background location in Expo Go
    try {
      const background = await Location.requestBackgroundPermissionsAsync();
      
      if (!background.granted) {
        if (!background.canAskAgain) {
          Alert.alert(
            "Permesso background richiesto",
            "Per tracciare le camminate anche a schermo spento, abilita 'Sempre' nelle impostazioni di localizzazione.",
            [
              { text: "Annulla", style: "cancel" },
              { 
                text: "Impostazioni", 
                onPress: () => {
                  Linking.openSettings();
                }
              },
            ]
          );
        }
        return { foreground: true, background: false };
      }

      return { foreground: true, background: true };
    } catch (error) {
      console.error("Error requesting background permissions:", error);
      return { foreground: true, background: false };
    }
  }

  async startTracking(walkId: string): Promise<boolean> {
    const permissions = await this.requestPermissions();
    
    if (!permissions.foreground) {
      return false;
    }

    const startTime = Date.now();
    await setActiveWalk(walkId, startTime);

    if (!this.isWebMode && permissions.background) {
      try {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (!isRunning) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 5000,
            showsBackgroundLocationIndicator: true,
            pausesUpdatesAutomatically: false,
            foregroundService: {
              notificationTitle: "Step Ritual attivo",
              notificationBody: "Tracciamento camminata in corso",
              notificationColor: "#FF2FB3",
            },
          });
        }
      } catch (error) {
        console.error("Error starting background location:", error);
      }
    }

    this.startForegroundWatcher(walkId);

    return true;
  }

  private async startForegroundWatcher(walkId: string): Promise<void> {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
    }

    this.foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 3,
      },
      async (location) => {
        const activeWalk = await getActiveWalk();
        if (!activeWalk || activeWalk.isPaused) return;

        await persistLocationsBatch(walkId, [location]);
      }
    );
  }

  async pauseTracking(): Promise<void> {
    const activeWalk = await getActiveWalk();
    if (!activeWalk) return;

    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }

    const pausedTime = Date.now() - activeWalk.startTime - activeWalk.pausedTime;
    await updateActiveWalkPause(true, pausedTime);
  }

  async resumeTracking(): Promise<void> {
    const activeWalk = await getActiveWalk();
    if (!activeWalk) return;

    await updateActiveWalkPause(false, activeWalk.pausedTime);
    this.startForegroundWatcher(activeWalk.walkId);
  }

  async stopTracking(): Promise<{
    path: LocationPoint[];
    distanceKm: number;
    durationSeconds: number;
  } | null> {
    const activeWalk = await getActiveWalk();
    if (!activeWalk) return null;

    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }

    if (!this.isWebMode) {
      try {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (isRunning) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      } catch (error) {
        console.error("Error stopping background location:", error);
      }
    }

    const trackPoints = await getTrackPoints(activeWalk.walkId);
    const path = trackPoints.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));

    const distanceKm = this.calculateTotalDistance(trackPoints);
    const durationSeconds = Math.floor(
      (Date.now() - activeWalk.startTime - activeWalk.pausedTime) / 1000
    );

    await clearTrackPoints(activeWalk.walkId);
    await clearActiveWalk();

    return {
      path,
      distanceKm,
      durationSeconds,
    };
  }

  private calculateTotalDistance(points: TrackPoint[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += this.haversineDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }
    return total;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getStatus(): Promise<TrackingStatus> {
    const activeWalk = await getActiveWalk();
    
    if (!activeWalk) {
      return {
        isTracking: false,
        isPaused: false,
        walkId: null,
        startTime: null,
        pausedTime: 0,
      };
    }

    return {
      isTracking: true,
      isPaused: activeWalk.isPaused,
      walkId: activeWalk.walkId,
      startTime: activeWalk.startTime,
      pausedTime: activeWalk.pausedTime,
    };
  }

  async getPath(walkId: string): Promise<LocationPoint[]> {
    const points = await getTrackPoints(walkId);
    return points.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
  }

  async getCurrentDistance(walkId: string): Promise<number> {
    const points = await getTrackPoints(walkId);
    return this.calculateTotalDistance(points);
  }

  async getLastLocation(walkId: string): Promise<LocationPoint | null> {
    const point = await getLatestTrackPoint(walkId);
    if (!point) return null;
    return {
      latitude: point.latitude,
      longitude: point.longitude,
    };
  }

  async isTracking(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isTracking;
  }
}

export const trackingService = new TrackingService();
