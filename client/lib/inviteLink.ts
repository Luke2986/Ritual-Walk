import { useEffect, useSyncExternalStore } from "react";
import * as Linking from "expo-linking";

// An invite code that arrived through a link, kept until the account screen uses it
// (also across login, when the link opened a logged-out app).
let pendingCode: string | null = null;
const listeners = new Set<() => void>();

function setPendingCode(code: string | null) {
  pendingCode = code;
  listeners.forEach((listener) => listener());
}

export function clearPendingInviteCode() {
  setPendingCode(null);
}

export function usePendingInviteCode(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pendingCode,
  );
}

const CODE_PATTERN = /^[A-Z0-9]{6,8}$/;

// Accepts stepritual://invito?code=ABCD2345 and https://<api>/invito/ABCD2345.
export function parseInviteCode(url: string): string | null {
  const { hostname, path, queryParams } = Linking.parse(url);
  const segments = [hostname, ...(path ?? "").split("/")].filter(Boolean);
  const at = segments.indexOf("invito");
  if (at === -1) return null;
  const raw = queryParams?.code ?? segments[at + 1];
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return CODE_PATTERN.test(code) ? code : null;
}

// Listens for links that open the app and stores the invite code they carry.
export function useInviteLinkListener() {
  const url = Linking.useURL();
  useEffect(() => {
    const code = url ? parseInviteCode(url) : null;
    if (code) setPendingCode(code);
  }, [url]);
}

export function inviteLinkFor(apiUrl: string, code: string): string {
  return `${apiUrl}/invito/${code}`;
}
