import { useState, useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

export type SessionState = "idle" | "running" | "locked" | "summary";

export interface WalkSessionData {
  steps: number;
  distanceKm: number;
  durationSeconds: number;
  startTime: number | null;
}

interface UseWalkSessionReturn {
  sessionState: SessionState;
  steps: number;
  distanceKm: number;
  durationSeconds: number;
  isLocked: boolean;
  isPedometerAvailable: boolean;
  startSession: () => Promise<boolean>;
  stopSession: () => void;
  toggleLock: () => void;
  unlock: () => void;
  confirmSummary: () => Promise<void>;
  dismissSummary: () => void;
  formatDuration: (seconds: number) => string;
  formatDurationAccessible: (seconds: number) => string;
}

const STEP_LENGTH_KM = 0.0007;

export function useWalkSession(): UseWalkSessionReturn {
  const { refreshUser } = useAuth();
  
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [steps, setSteps] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [walkId, setWalkId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [initialSteps, setInitialSteps] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pedometerSubscription = useRef<any>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const summaryDataRef = useRef<WalkSessionData | null>(null);

  const distanceKm = steps * STEP_LENGTH_KM;

  useEffect(() => {
    Pedometer.isAvailableAsync().then(setIsPedometerAvailable);
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        sessionState === "running" &&
        startTime
      ) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDurationSeconds(elapsed);

        if (Platform.OS === "ios" && isPedometerAvailable) {
          try {
            const result = await Pedometer.getStepCountAsync(
              new Date(startTime),
              new Date()
            );
            setSteps(result.steps);
          } catch (error) {
            console.error("Error fetching step count:", error);
          }
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [sessionState, startTime, isPedometerAvailable]);

  const startSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/walks/start");
      const data = await response.json();
      const newWalkId = data.walk.id;
      
      setWalkId(newWalkId);
      setSteps(0);
      setDurationSeconds(0);
      setIsLocked(false);
      const now = Date.now();
      setStartTime(now);
      setSessionState("running");

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);

      if (isPedometerAvailable) {
        try {
          const result = await Pedometer.getStepCountAsync(
            new Date(now - 1000),
            new Date(now)
          );
          setInitialSteps(result.steps || 0);
        } catch {}

        pedometerSubscription.current = Pedometer.watchStepCount((result: { steps: number }) => {
          setSteps(result.steps);
        });
      }

      return true;
    } catch (error) {
      console.error("Error starting session:", error);
      return false;
    }
  }, [isPedometerAvailable]);

  const stopSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (pedometerSubscription.current) {
      pedometerSubscription.current.remove();
      pedometerSubscription.current = null;
    }

    summaryDataRef.current = {
      steps,
      distanceKm,
      durationSeconds,
      startTime,
    };

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setIsLocked(false);
    setSessionState("summary");
  }, [steps, distanceKm, durationSeconds, startTime]);

  const confirmSummary = useCallback(async () => {
    if (walkId && summaryDataRef.current) {
      try {
        await apiRequest("POST", `/api/walks/${walkId}/end`, {
          distanceKm: summaryDataRef.current.distanceKm,
          durationSeconds: summaryDataRef.current.durationSeconds,
          stepsTotal: summaryDataRef.current.steps,
          pathJson: [],
        });
        await refreshUser();
      } catch (error) {
        console.error("Error saving walk:", error);
      }
    }

    setSessionState("idle");
    setWalkId(null);
    setSteps(0);
    setDurationSeconds(0);
    setStartTime(null);
    summaryDataRef.current = null;
  }, [walkId, refreshUser]);

  const dismissSummary = useCallback(() => {
    setSessionState("idle");
    setWalkId(null);
    setSteps(0);
    setDurationSeconds(0);
    setStartTime(null);
    summaryDataRef.current = null;
  }, []);

  const toggleLock = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsLocked((prev) => !prev);
  }, []);

  const unlock = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setIsLocked(false);
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const formatDurationAccessible = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "ora" : "ore"}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minuti"}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} ${secs === 1 ? "secondo" : "secondi"}`);
    
    return parts.join(" e ");
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();
      }
    };
  }, []);

  return {
    sessionState,
    steps,
    distanceKm,
    durationSeconds,
    isLocked,
    isPedometerAvailable,
    startSession,
    stopSession,
    toggleLock,
    unlock,
    confirmSummary,
    dismissSummary,
    formatDuration,
    formatDurationAccessible,
  };
}
