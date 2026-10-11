import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { apiRequest, ApiError, queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import {
  trackingService,
  elapsedSeconds,
  pathDistanceKm,
  simplifyPath,
  type ActiveSession,
  type GpsMode,
  type TrackPoint,
} from "@/lib/tracking";
import { toLocalDateKey } from "@shared/dates";
import type { BadgeKey } from "@shared/badges";
import { invalidateBadges } from "@/lib/badgesQuery";

export type SessionState =
  | "idle"
  | "starting"
  | "running"
  | "paused"
  | "summary";

const STEP_LENGTH_KM = 0.0007;
const MAX_PATH_POINTS = 5000;
const POINT_POLL_MS = 2000;
const STEP_SAVE_MS = 15000;

function haptic(type: Haptics.NotificationFeedbackType) {
  Haptics.notificationAsync(type).catch(() => {});
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatDurationAccessible(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "ora" : "ore"}`);
  if (minutes > 0)
    parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minuti"}`);
  if (secs > 0 || parts.length === 0)
    parts.push(`${secs} ${secs === 1 ? "secondo" : "secondi"}`);

  return parts.join(" e ");
}

export function useWalkSession() {
  const { refreshUser } = useAuth();

  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [gpsMode, setGpsMode] = useState<GpsMode>("off");
  const [stepsBase, setStepsBase] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Badges the ritual reached with the walk just saved, shown before the sheet closes.
  const [newBadges, setNewBadges] = useState<BadgeKey[]>([]);

  const pedometerRef = useRef<{ remove: () => void } | null>(null);
  const pedometerGenRef = useRef(0);
  const lastPointIdRef = useRef(0);

  const steps = stepsBase + liveSteps;
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  const gpsDistanceKm = useMemo(() => pathDistanceKm(points), [points]);
  const distanceKm =
    points.length >= 2 ? gpsDistanceKm : steps * STEP_LENGTH_KM;
  const durationSeconds = session ? elapsedSeconds(session, now) : 0;

  const stopPedometer = useCallback(() => {
    pedometerGenRef.current += 1;
    pedometerRef.current?.remove();
    pedometerRef.current = null;
  }, []);

  // watchStepCount reports steps since subscribing, so each running stretch adds to stepsBase.
  const startPedometer = useCallback(async () => {
    stopPedometer();
    if (Platform.OS === "web") return;
    const gen = pedometerGenRef.current;
    const available = await Pedometer.isAvailableAsync().catch(() => false);
    // Paused or stopped while we were waiting.
    if (!available || gen !== pedometerGenRef.current) return;
    setLiveSteps(0);
    pedometerRef.current = Pedometer.watchStepCount((result) => {
      setLiveSteps(result.steps);
    });
  }, [stopPedometer]);

  const commitSteps = useCallback(() => {
    stopPedometer();
    const total = stepsRef.current;
    setStepsBase(total);
    setLiveSteps(0);
    return total;
  }, [stopPedometer]);

  const pullNewPoints = useCallback(async (walkId: string) => {
    const fresh = await trackingService.getPoints(
      walkId,
      lastPointIdRef.current,
    );
    // Polling and pause/stop can pull concurrently; keep each point once.
    const unseen = fresh.filter((p) => p.id > lastPointIdRef.current);
    if (unseen.length === 0) return;
    lastPointIdRef.current = unseen[unseen.length - 1].id;
    setPoints((prev) => [...prev, ...unseen]);
  }, []);

  const reset = useCallback(() => {
    stopPedometer();
    lastPointIdRef.current = 0;
    setSession(null);
    setPoints([]);
    setStepsBase(0);
    setLiveSteps(0);
    setGpsMode("off");
    setIsLocked(false);
    setSaveError(null);
    setSessionState("idle");
  }, [stopPedometer]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const restored = await trackingService.restore();
        if (cancelled || !restored) return;

        const { session: saved, gps } = restored;
        const savedPoints = await trackingService.getPoints(saved.walkId);
        if (cancelled) return;

        lastPointIdRef.current = savedPoints[savedPoints.length - 1]?.id ?? 0;
        setPoints(savedPoints);
        setSession(saved);
        setStepsBase(saved.steps);
        setGpsMode(gps);
        if (saved.endedAt !== null) {
          setSessionState("summary");
        } else if (saved.pausedAt !== null) {
          setSessionState("paused");
        } else {
          setSessionState("running");
          startPedometer();
        }
      } catch (error) {
        console.warn("Could not restore walk:", error);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startPedometer]);

  const walkId = session?.walkId;

  useEffect(() => {
    if (sessionState !== "running" || !walkId) return;

    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      pullNewPoints(walkId).catch(() => {});
    }, POINT_POLL_MS);
    const saveStepsTimer = setInterval(() => {
      trackingService.saveSteps(stepsRef.current).catch(() => {});
    }, STEP_SAVE_MS);

    return () => {
      clearInterval(tick);
      clearInterval(poll);
      clearInterval(saveStepsTimer);
    };
  }, [sessionState, walkId, pullNewPoints]);

  useEffect(() => stopPedometer, [stopPedometer]);

  const startSession = useCallback(async (): Promise<GpsMode> => {
    setSessionState("starting");
    try {
      const response = await apiRequest("POST", "/api/walks/start");
      const { walk } = await response.json();

      if (Platform.OS !== "web") {
        await Pedometer.requestPermissionsAsync().catch(() => null);
      }

      const startedAt = Date.now();
      const gps = await trackingService.start(walk.id, startedAt);

      lastPointIdRef.current = 0;
      setPoints([]);
      setStepsBase(0);
      setLiveSteps(0);
      setIsLocked(false);
      setSaveError(null);
      setGpsMode(gps);
      setNow(startedAt);
      setSession({
        walkId: walk.id,
        startedAt,
        pausedMs: 0,
        pausedAt: null,
        endedAt: null,
        segment: 0,
        steps: 0,
      });
      setSessionState("running");
      startPedometer();
      haptic(Haptics.NotificationFeedbackType.Success);
      return gps;
    } catch (error) {
      setSessionState("idle");
      throw error;
    }
  }, [startPedometer]);

  const pauseSession = useCallback(async () => {
    if (sessionState !== "running") return;
    const total = commitSteps();
    const pausedAt = Date.now();
    setSession((s) => (s ? { ...s, pausedAt, steps: total } : s));
    setNow(pausedAt);
    setSessionState("paused");
    await trackingService.pause(total);
    if (walkId) await pullNewPoints(walkId).catch(() => {});
  }, [sessionState, commitSteps, walkId, pullNewPoints]);

  const resumeSession = useCallback(async () => {
    if (sessionState !== "paused") return;
    const resumedAt = Date.now();
    setSession((s) =>
      s && s.pausedAt !== null
        ? {
            ...s,
            pausedMs: s.pausedMs + (resumedAt - s.pausedAt),
            pausedAt: null,
            segment: s.segment + 1,
          }
        : s,
    );
    setNow(resumedAt);
    setSessionState("running");
    startPedometer();
    setGpsMode(await trackingService.resume());
  }, [sessionState, startPedometer]);

  const stopSession = useCallback(async () => {
    if (sessionState !== "running" && sessionState !== "paused") return;
    const total = sessionState === "running" ? commitSteps() : stepsRef.current;
    const endedAt = session?.pausedAt ?? Date.now();
    setSession((s) => (s ? { ...s, endedAt, steps: total } : s));
    setIsLocked(false);
    setSessionState("summary");
    haptic(Haptics.NotificationFeedbackType.Success);

    await trackingService.finish(total);
    if (walkId) await pullNewPoints(walkId).catch(() => {});
  }, [sessionState, session, commitSteps, walkId, pullNewPoints]);

  const confirmSummary = useCallback(async () => {
    if (!session || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    let earned: BadgeKey[] = [];
    try {
      const response = await apiRequest(
        "POST",
        `/api/walks/${session.walkId}/end`,
        {
          distanceKm: Math.min(Math.round(distanceKm * 1000) / 1000, 200),
          durationSeconds: Math.min(durationSeconds, 24 * 60 * 60),
          stepsTotal: steps,
          pathJson: simplifyPath(points, MAX_PATH_POINTS),
          localDate: toLocalDateKey(new Date(session.startedAt)),
        },
      );
      const body = await response.json().catch(() => null);
      earned = Array.isArray(body?.newBadges) ? body.newBadges : [];
    } catch (error) {
      // 409 means an earlier attempt already saved it (e.g. the response was lost).
      if (!(error instanceof ApiError && error.status === 409)) {
        setSaveError(
          error instanceof ApiError && error.status === 404
            ? "Questa camminata non esiste più sul server (forse ne hai iniziata un'altra da un altro dispositivo)."
            : "Salvataggio non riuscito. Controlla la connessione e riprova.",
        );
        setIsSaving(false);
        return;
      }
    }

    await trackingService.clear().catch(() => {});
    reset();
    setIsSaving(false);
    setNewBadges(earned);
    queryClient.invalidateQueries({ queryKey: ["/api/walks/recent"] });
    queryClient.invalidateQueries({ queryKey: ["/api/walks/stats"] });
    invalidateBadges();
    refreshUser().catch(() => {});
  }, [
    session,
    isSaving,
    distanceKm,
    durationSeconds,
    steps,
    points,
    reset,
    refreshUser,
  ]);

  const dismissNewBadges = useCallback(() => setNewBadges([]), []);

  const discardSession = useCallback(async () => {
    if (session) {
      apiRequest("POST", `/api/walks/${session.walkId}/discard`).catch(
        () => {},
      );
    }
    await trackingService.clear().catch(() => {});
    reset();
  }, [session, reset]);

  const toggleLock = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsLocked((prev) => !prev);
  }, []);

  const unlock = useCallback(() => {
    haptic(Haptics.NotificationFeedbackType.Success);
    setIsLocked(false);
  }, []);

  return {
    sessionState,
    isReady,
    steps,
    distanceKm,
    durationSeconds,
    points,
    gpsMode,
    isLocked,
    isSaving,
    saveError,
    newBadges,
    dismissNewBadges,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    toggleLock,
    unlock,
    confirmSummary,
    discardSession,
  };
}
