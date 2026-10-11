import * as Location from "expo-location";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import {
  ActiveSession,
  clearSession,
  createSession,
  getActiveSession,
  getTrackPoints,
  markEnded,
  markPaused,
  markResumed,
  persistFixes,
  saveSteps,
  TrackPoint,
} from "./persistence";
import { LOCATION_TASK_NAME, toRawFix } from "./backgroundLocationTask";

// "background": keeps tracking with the screen off. "foreground": only while the app is open.
export type GpsMode = "background" | "foreground" | "off";

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

class TrackingService {
  private watcher: Location.LocationSubscription | null = null;

  // "While using the app" is enough for screen-off tracking when updates start with the app
  // open (foreground service on Android, background mode on iOS), so we never ask for "Always".
  // Expo Go cannot run location tasks at all.
  private async requestPermissions(): Promise<GpsMode> {
    if (Platform.OS === "web") return "off";

    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) return "off";
    return isExpoGo ? "foreground" : "background";
  }

  private async startUpdates(mode: GpsMode): Promise<GpsMode> {
    if (mode === "background") {
      try {
        const running =
          await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (!running) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.BestForNavigation,
            activityType: Location.ActivityType.Fitness,
            distanceInterval: 5,
            timeInterval: 3000,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "Step Ritual",
              notificationBody: "Camminata in corso",
              notificationColor: "#FF2FB3",
            },
          });
        }
        return "background";
      } catch (error) {
        console.warn("Background location unavailable:", error);
      }
    }

    if (mode === "off") return "off";

    this.watcher?.remove();
    this.watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (location) => {
        persistFixes([toRawFix(location)]).catch((error) =>
          console.warn("Could not store location:", error),
        );
      },
    );
    return "foreground";
  }

  private async stopUpdates(): Promise<void> {
    this.watcher?.remove();
    this.watcher = null;

    if (Platform.OS === "web") return;
    try {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (error) {
      console.warn("Could not stop background location:", error);
    }
  }

  async start(walkId: string, startedAt: number): Promise<GpsMode> {
    await createSession(walkId, startedAt);
    return this.startUpdates(await this.requestPermissions());
  }

  // After the app was killed or reloaded mid-walk: re-attach GPS without prompting again.
  async restore(): Promise<{ session: ActiveSession; gps: GpsMode } | null> {
    const session = await getActiveSession();
    if (!session) return null;
    if (session.pausedAt !== null || session.endedAt !== null) {
      return { session, gps: "off" };
    }

    const foreground = await Location.getForegroundPermissionsAsync();
    if (!foreground.granted) return { session, gps: "off" };
    const gps = await this.startUpdates(isExpoGo ? "foreground" : "background");
    return { session, gps };
  }

  async pause(steps: number): Promise<void> {
    await markPaused(Date.now(), steps);
    await this.stopUpdates();
  }

  async resume(): Promise<GpsMode> {
    await markResumed(Date.now());
    return (await this.restore())?.gps ?? "off";
  }

  async finish(steps: number): Promise<ActiveSession | null> {
    await this.stopUpdates();
    const session = await getActiveSession();
    if (!session) return null;
    await markEnded(session.pausedAt ?? Date.now(), steps);
    return getActiveSession();
  }

  saveSteps(steps: number): Promise<void> {
    return saveSteps(steps);
  }

  getPoints(walkId: string, afterId = 0): Promise<TrackPoint[]> {
    return getTrackPoints(walkId, afterId);
  }

  async clear(): Promise<void> {
    await this.stopUpdates();
    await clearSession();
  }
}

export function elapsedSeconds(session: ActiveSession, now = Date.now()) {
  const end = session.endedAt ?? session.pausedAt ?? now;
  return Math.max(
    0,
    Math.floor((end - session.startedAt - session.pausedMs) / 1000),
  );
}

export const trackingService = new TrackingService();
