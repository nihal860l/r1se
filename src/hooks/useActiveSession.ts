import { useState, useEffect, useCallback } from 'react';
import { IntensityLevel, SetType } from '@/types/workout';

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
  startedAt: number; // timestamp ms
  elapsedBeforePause: number; // seconds accumulated before last pause
  pausedAt: number | null; // timestamp ms when paused, null if running

  // Classic mode state
  exerciseLogs?: Record<string, SessionSetLog[]>;
  workoutExercises?: any[]; // WorkoutExercise[]

  // Guided mode state
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

export function useActiveSession() {
  const [session, setSession] = useState<ActiveSession | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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
        startedAt: now, // reset reference point
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

  // Get total elapsed seconds (accounts for pauses)
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
  };
}
