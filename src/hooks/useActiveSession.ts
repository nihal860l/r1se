import { useState, useEffect, useCallback } from 'react';
import { IntensityLevel, SetType } from '@/types/workout';
import { useWorkoutStore } from '@/store/workoutStore';
import { toast } from 'sonner';

export interface SessionSetLog {
  weight: number;
  reps: number | null;
  intensity: IntensityLevel | null;
  setType: SetType;
  completed: boolean;
  targetReps?: number;
  challengeAccumulatedReps?: number;
}

export interface ActiveSession {
  workoutId: string;
  workoutName: string;
  mode: 'guided' | 'classic';
  startedAt: number;
  elapsedBeforePause: number;
  pausedAt: number | null;

  exerciseLogs?: Record<string, SessionSetLog[]>;
  workoutExercises?: any[];

  guidedState?: {
    currentSetIndex: number;
    phase: 'perform' | 'rest';
    reps: number;
    restSeconds: number;
    challengeAccumulated: number;
    challengeAttempt: number;
    completedSets: Record<string, any[]>;
  };
}

const STORAGE_KEY = 'active-workout-session';

function isStaleSession(session: ActiveSession): boolean {
  if (!session.pausedAt) return false;
  return new Date(session.pausedAt).toDateString() !== new Date().toDateString();
}

function autoLogSession(session: ActiveSession, addWorkoutLog: any) {
  const exercises: { exerciseId: string; exerciseName: string; sets: any[] }[] = [];

  if (session.mode === 'classic' && session.exerciseLogs) {
    Object.entries(session.exerciseLogs).forEach(([exerciseId, sets]) => {
      const completedSets = sets
        .filter((s) => s.completed)
        .map((s) => ({
          reps: s.setType === 'challenge' ? (s.challengeAccumulatedReps || 0) : (s.reps || 0),
          weight: s.weight,
          intensity: s.intensity || undefined,
          setType: s.setType || undefined,
          targetReps: s.targetReps,
        }));
      if (completedSets.length > 0) {
        exercises.push({
          exerciseId,
          exerciseName: exerciseId, // best effort
          sets: completedSets,
        });
      }
    });
  } else if (session.mode === 'guided' && session.guidedState?.completedSets) {
    Object.entries(session.guidedState.completedSets).forEach(([exerciseId, sets]) => {
      if (sets.length > 0) {
        exercises.push({
          exerciseId,
          exerciseName: exerciseId,
          sets: sets.map((s: any) => ({
            reps: s.reps || 0,
            weight: s.weight || 0,
            intensity: s.intensity || undefined,
            setType: s.setType || undefined,
            targetReps: s.targetReps,
          })),
        });
      }
    });
  }

  if (exercises.length > 0) {
    addWorkoutLog({
      id: crypto.randomUUID(),
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      completedAt: new Date(session.pausedAt || session.startedAt),
      duration: Math.floor(session.elapsedBeforePause / 60),
      exercises,
    });
  }
}

export function useActiveSession() {
  const [session, setSession] = useState<ActiveSession | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed: ActiveSession = JSON.parse(stored);

      // Staleness check
      if (parsed.pausedAt && isStaleSession(parsed)) {
        const keepOvernight = (() => {
          try {
            return JSON.parse(localStorage.getItem('pref-keep-session-overnight') || 'false');
          } catch {
            return false;
          }
        })();

        if (!keepOvernight) {
          // Auto-log and clear
          autoLogSession(parsed, useWorkoutStore.getState().addWorkoutLog);
          localStorage.removeItem(STORAGE_KEY);
          // Set flag for toast in Today page
          sessionStorage.setItem('session-auto-cleared', 'true');
          return null;
        }
      }

      return parsed;
    } catch {
      return null;
    }
  });

  const [sessionAutoCleared] = useState(() => {
    const cleared = sessionStorage.getItem('session-auto-cleared') === 'true';
    if (cleared) sessionStorage.removeItem('session-auto-cleared');
    return cleared;
  });

  // Show toast if auto-cleared
  useEffect(() => {
    if (sessionAutoCleared) {
      toast("Yesterday's paused workout was logged automatically.");
    }
  }, [sessionAutoCleared]);

  // Persist to localStorage whenever session changes
  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const startSession = useCallback((data: Omit<ActiveSession, 'elapsedBeforePause' | 'pausedAt'>) => {
    const newSession: ActiveSession = {
      ...data,
      elapsedBeforePause: 0,
      pausedAt: null,
    };
    setSession(newSession);
  }, []);

  const updateSession = useCallback((updates: Partial<ActiveSession>) => {
    setSession(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const pauseSession = useCallback((stateSnapshot: Partial<ActiveSession>) => {
    setSession(prev => {
      if (!prev) return null;
      const now = Date.now();
      const runningElapsed = prev.pausedAt
        ? prev.elapsedBeforePause
        : prev.elapsedBeforePause + Math.floor((now - prev.startedAt) / 1000);
      return {
        ...prev,
        ...stateSnapshot,
        elapsedBeforePause: runningElapsed,
        pausedAt: now,
        startedAt: now,
      };
    });
  }, []);

  const resumeSession = useCallback(() => {
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pausedAt: null,
        startedAt: Date.now(),
      };
    });
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getElapsed = useCallback(() => {
    if (!session) return 0;
    if (session.pausedAt) return session.elapsedBeforePause;
    return session.elapsedBeforePause + Math.floor((Date.now() - session.startedAt) / 1000);
  }, [session]);

  return {
    session,
    startSession,
    updateSession,
    pauseSession,
    resumeSession,
    clearSession,
    getElapsed,
    hasActiveSession: session !== null,
    sessionAutoCleared,
  };
}
