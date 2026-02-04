import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKGROUND_LOCATION_TASK = "STEP_RITUAL_BACKGROUND_LOCATION";
const LOCATION_STORAGE_KEY = "@step_ritual_background_locations";

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
  speed: number | null;
}

interface GPSFilter {
  minDistance: number;
  maxAccuracy: number;
  maxSpeed: number;
  smoothingWindow: number;
}

const GPS_FILTER: GPSFilter = {
  minDistance: 5,
  maxAccuracy: 20,
  maxSpeed: 7,
  smoothingWindow: 3,
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isValidLocation = (
  newLocation: LocationPoint,
  lastLocation: LocationPoint | null
): boolean => {
  if (
    newLocation.accuracy !== null &&
    newLocation.accuracy > GPS_FILTER.maxAccuracy
  ) {
    console.log(
      `[GPS Filter] Rejected: accuracy ${newLocation.accuracy}m > ${GPS_FILTER.maxAccuracy}m`
    );
    return false;
  }

  if (
    newLocation.speed !== null &&
    newLocation.speed > GPS_FILTER.maxSpeed
  ) {
    console.log(
      `[GPS Filter] Rejected: speed ${newLocation.speed}m/s > ${GPS_FILTER.maxSpeed}m/s`
    );
    return false;
  }

  if (lastLocation) {
    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    if (distance < GPS_FILTER.minDistance) {
      console.log(
        `[GPS Filter] Rejected: distance ${distance.toFixed(1)}m < ${GPS_FILTER.minDistance}m`
      );
      return false;
    }

    const timeDiff = (newLocation.timestamp - lastLocation.timestamp) / 1000;
    if (timeDiff > 0) {
      const impliedSpeed = distance / timeDiff;
      if (impliedSpeed > GPS_FILTER.maxSpeed) {
        console.log(
          `[GPS Filter] Rejected: implied speed ${impliedSpeed.toFixed(1)}m/s > ${GPS_FILTER.maxSpeed}m/s`
        );
        return false;
      }
    }
  }

  return true;
};

const smoothLocations = (
  locations: LocationPoint[],
  windowSize: number
): LocationPoint[] => {
  if (locations.length < windowSize) return locations;

  const smoothed: LocationPoint[] = [];
  for (let i = 0; i < locations.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(locations.length, i + Math.ceil(windowSize / 2));
    const window = locations.slice(start, end);

    const avgLat =
      window.reduce((sum, loc) => sum + loc.latitude, 0) / window.length;
    const avgLon =
      window.reduce((sum, loc) => sum + loc.longitude, 0) / window.length;

    smoothed.push({
      ...locations[i],
      latitude: avgLat,
      longitude: avgLon,
    });
  }
  return smoothed;
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: { data: any; error: any }) => {
  if (error) {
    console.error("[Background Location] Task error:", error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    try {
      const storedData = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      const existingLocations: LocationPoint[] = storedData
        ? JSON.parse(storedData)
        : [];
      const lastLocation =
        existingLocations.length > 0
          ? existingLocations[existingLocations.length - 1]
          : null;

      const newValidLocations: LocationPoint[] = [];
      let currentLast = lastLocation;

      for (const loc of locations) {
        const newPoint: LocationPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy,
          speed: loc.coords.speed,
        };

        if (isValidLocation(newPoint, currentLast)) {
          newValidLocations.push(newPoint);
          currentLast = newPoint;
        }
      }

      if (newValidLocations.length > 0) {
        const updatedLocations = [...existingLocations, ...newValidLocations];
        await AsyncStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(updatedLocations)
        );
        console.log(
          `[Background Location] Added ${newValidLocations.length} valid points`
        );
      }
    } catch (e) {
      console.error("[Background Location] Storage error:", e);
    }
  }
});

export const startBackgroundLocationTracking = async (): Promise<boolean> => {
  try {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      console.log("[Background Location] Foreground permission denied");
      return false;
    }

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      console.log("[Background Location] Background permission denied");
      return false;
    }

    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify([]));

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Step Ritual",
        notificationBody: "Tracciamento camminata in corso...",
        notificationColor: "#00E5FF",
      },
    });

    console.log("[Background Location] Started tracking");
    return true;
  } catch (e) {
    console.error("[Background Location] Start error:", e);
    return false;
  }
};

export const stopBackgroundLocationTracking = async (): Promise<
  LocationPoint[]
> => {
  try {
    const isRunning = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK
    );
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    const storedData = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    const locations: LocationPoint[] = storedData ? JSON.parse(storedData) : [];

    const smoothedLocations = smoothLocations(
      locations,
      GPS_FILTER.smoothingWindow
    );

    await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);

    console.log(
      `[Background Location] Stopped. Total points: ${smoothedLocations.length}`
    );
    return smoothedLocations;
  } catch (e) {
    console.error("[Background Location] Stop error:", e);
    return [];
  }
};

export const getBackgroundLocations = async (): Promise<LocationPoint[]> => {
  try {
    const storedData = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : [];
  } catch (e) {
    console.error("[Background Location] Get error:", e);
    return [];
  }
};

export const isBackgroundLocationRunning = async (): Promise<boolean> => {
  return TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
};
