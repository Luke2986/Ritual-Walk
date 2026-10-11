import { toLocalDateKey } from "@shared/dates";
import type { BadgeKey, BadgeProgress } from "@shared/badges";
import { queryClient } from "@/lib/query-client";

export interface BadgesResponse {
  earned: { key: BadgeKey; earnedAt: string }[];
  progress: BadgeProgress;
}

// The server needs the phone's date to tell which week is "this week".
export function badgesQueryKey(): string[] {
  return [`/api/badges?today=${toLocalDateKey(new Date())}`];
}

export function invalidateBadges() {
  return queryClient.invalidateQueries({
    predicate: (query) => String(query.queryKey[0]).startsWith("/api/badges"),
  });
}
