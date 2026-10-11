import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { isInQuietHours } from "@shared/quietHours";

export interface NotificationPrefs {
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
  reminderTime: string;
  reminderDays: number[];
  reminderMessage: string | null;
  partnerAlertsEnabled: boolean;
  badgesEnabled: boolean;
  weeklySummaryEnabled: boolean;
  weeklySummaryDay: number;
  weeklySummaryTime: string;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  pushToken: string | null;
  timeZone: string | null;
}

const CHANNEL_ID = "reminders";
const DEFAULT_REMINDER = "È l'ora del vostro rituale: una camminata insieme?";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Prefs use 1 = Monday … 7 = Sunday; expo-notifications uses 1 = Sunday … 7 = Saturday.
const toExpoWeekday = (day: number) => (day % 7) + 1;

function weeklyTrigger(day: number, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: toExpoWeekday(day),
    hour,
    minute,
    channelId: CHANNEL_ID,
  } as const;
}

export async function clearScheduledNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

export async function syncScheduledNotifications(
  prefs: NotificationPrefs,
): Promise<void> {
  if (Platform.OS === "web") return;

  await clearScheduledNotifications();
  if (!prefs.notificationsEnabled) return;

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Promemoria",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const quiet = (time: string) =>
    prefs.quietHoursEnabled &&
    isInQuietHours(time, prefs.quietStart, prefs.quietEnd);

  const requests: Promise<string>[] = [];

  if (prefs.remindersEnabled && !quiet(prefs.reminderTime)) {
    for (const day of prefs.reminderDays) {
      requests.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Step Ritual",
            body: prefs.reminderMessage?.trim() || DEFAULT_REMINDER,
          },
          trigger: weeklyTrigger(day, prefs.reminderTime),
        }),
      );
    }
  }

  if (prefs.weeklySummaryEnabled && !quiet(prefs.weeklySummaryTime)) {
    requests.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: "Il vostro riepilogo settimanale",
          body: "Apri Step Ritual per vedere quanti km avete fatto questa settimana.",
        },
        trigger: weeklyTrigger(prefs.weeklySummaryDay, prefs.weeklySummaryTime),
      }),
    );
  }

  await Promise.all(requests);
}
