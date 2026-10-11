import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  NotificationPrefs,
  syncScheduledNotifications,
} from "@/lib/notifications";
import { getPushRegistration } from "@/lib/pushNotifications";
import { apiRequest } from "@/lib/query-client";

const PREFS_KEY = ["/api/notification-prefs"];

// Local notifications are rescheduled whenever the saved preferences change,
// and this device's push token is sent to the server for partner alerts.
export function useNotificationSync() {
  const queryClient = useQueryClient();
  const { data: prefs } = useQuery<NotificationPrefs>({ queryKey: PREFS_KEY });

  useEffect(() => {
    if (!prefs) return;
    syncScheduledNotifications(prefs).catch((error) =>
      console.warn("Could not schedule notifications:", error),
    );
  }, [prefs]);

  useEffect(() => {
    if (!prefs?.notificationsEnabled || !prefs.partnerAlertsEnabled) return;

    getPushRegistration()
      .then(async (registration) => {
        if (
          !registration ||
          (registration.pushToken === prefs.pushToken &&
            registration.timeZone === prefs.timeZone)
        ) {
          return;
        }
        const response = await apiRequest(
          "PUT",
          "/api/notification-prefs",
          registration,
        );
        queryClient.setQueryData(PREFS_KEY, await response.json());
      })
      .catch((error) => console.warn("Could not register for push:", error));
  }, [prefs, queryClient]);
}
