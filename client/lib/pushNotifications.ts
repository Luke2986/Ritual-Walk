import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { isValidTimeZone } from "@shared/quietHours";

const projectId: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// Remote push needs an EAS project id; Expo Go on Android no longer receives it.
export const isPushSupported =
  Platform.OS !== "web" &&
  !!projectId &&
  !(
    Platform.OS === "android" &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );

export async function getPushRegistration(): Promise<{
  pushToken: string;
  timeZone: string | null;
} | null> {
  if (!isPushSupported) return null;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("partner", {
      name: "Avvisi di camminata",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    pushToken,
    timeZone: timeZone && isValidTimeZone(timeZone) ? timeZone : null,
  };
}
