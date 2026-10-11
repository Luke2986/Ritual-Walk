const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushResult = "sent" | "unregistered" | "failed";

// Expo's push service forwards to APNs/FCM; no key is needed unless the
// project enables enhanced push security (then set EXPO_ACCESS_TOKEN).
export async function sendExpoPush(
  to: string,
  title: string,
  body: string,
): Promise<PushResult> {
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify([
      { to, title, body, sound: "default", channelId: "partner" },
    ]),
    signal: AbortSignal.timeout(4000),
  });
  const json = (await response.json().catch(() => null)) as {
    data?: { status?: string; details?: { error?: string } }[];
  } | null;
  const ticket = json?.data?.[0];

  if (ticket?.status === "ok") return "sent";
  if (ticket?.details?.error === "DeviceNotRegistered") return "unregistered";
  console.warn("Expo push failed:", response.status, JSON.stringify(json));
  return "failed";
}
