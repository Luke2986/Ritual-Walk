import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { persistFixes } from "./persistence";
import type { RawFix } from "./geo";

export const LOCATION_TASK_NAME = "step-ritual-background-location";

export function toRawFix(location: Location.LocationObject): RawFix {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    timestamp: location.timestamp,
  };
}

// Must be defined at module load so the OS can wake the JS runtime into it.
if (Platform.OS !== "web") {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    LOCATION_TASK_NAME,
    async ({ data, error }) => {
      if (error) {
        console.warn("Background location error:", error.message);
        return;
      }
      if (!data?.locations?.length) return;

      try {
        await persistFixes(data.locations.map(toRawFix));
      } catch (err) {
        console.warn("Could not store background locations:", err);
      }
    },
  );
}
