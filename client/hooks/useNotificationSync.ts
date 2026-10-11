import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  NotificationPrefs,
  syncScheduledNotifications,
} from "@/lib/notifications";

// Local notifications are rescheduled whenever the saved preferences change.
export function useNotificationSync() {
  const { data: prefs } = useQuery<NotificationPrefs>({
    queryKey: ["/api/notification-prefs"],
  });

  useEffect(() => {
    if (!prefs) return;
    syncScheduledNotifications(prefs).catch((error) =>
      console.warn("Could not schedule notifications:", error),
    );
  }, [prefs]);
}
