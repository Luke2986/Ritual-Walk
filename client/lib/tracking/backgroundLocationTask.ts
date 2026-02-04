import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { persistLocationsBatch, getActiveWalk } from "./persistence";

export const LOCATION_TASK_NAME = "step-ritual-background-location";

if (Platform.OS !== "web") {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error("Background location task error:", error);
      return;
    }

    const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
    if (!locations?.length) return;

    try {
      const activeWalk = await getActiveWalk();
      if (!activeWalk || activeWalk.isPaused) {
        return;
      }

      await persistLocationsBatch(activeWalk.walkId, locations);
    } catch (err) {
      console.error("Error persisting background locations:", err);
    }
  });
}

export async function isBackgroundLocationTaskRunning(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}
