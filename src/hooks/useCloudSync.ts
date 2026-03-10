import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Workout, WorkoutLog, Exercise, WorkoutPlan, WeeklyAssignments, PlanException } from '@/types/workout';
import { Json } from '@/integrations/supabase/types';
import { generateKeywords, muscleToCategory } from '@/lib/exerciseSearch';
import { useSyncQueueStore } from '@/store/syncQueueStore';

/**
 * MERGE-AWARE CLOUD SYNC with offline queue fallback.
 * 
 * When online: push directly to cloud.
 * When offline: enqueue operations for later processing.
 * On reconnect: merge local + cloud data (latest wins), never overwrite local changes.
 */

function isOnline(): boolean {
  return navigator.onLine;
}

// Persist hydration state per user in localStorage so it survives remounts/reloads
function getHydratedKey(userId: string) {
  return `cloud-sync-hydrated-${userId}`;
}
function hasUserHydrated(userId: string): boolean {
  return localStorage.getItem(getHydratedKey(userId)) === 'true';
}
function setUserHydrated(userId: string) {
  localStorage.setItem(getHydratedKey(userId), 'true');
}

export function useCloudSync() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef<number>(0);
  const hasHydrated = useRef(false);
  const enqueue = useSyncQueueStore((s) => s.enqueue);

  const workouts = useWorkoutStore((state) => state.workouts);
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const workoutPlans = useWorkoutStore((state) => state.workoutPlans);

  // Helper: try cloud operation, fall back to queue
  const tryOrQueue = useCallback(async (
    table: 'workouts' | 'exercises' | 'workout_history' | 'workout_plans' | 'active_sessions',
    operation: 'upsert' | 'delete',
    payload: Record<string, unknown>,
    cloudFn: () => Promise<void>,
  ) => {
    if (!isOnline()) {
      enqueue({ table, operation, payload });
      return;
    }
    try {
      await cloudFn();
    } catch (error) {
      console.error(`Cloud ${operation} on ${table} failed, queuing:`, error);
      enqueue({ table, operation, payload });
    }
  }, [enqueue]);

  const pushWorkout = useCallback(async (workout: Workout) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      workout_id: workout.id,
      name: workout.name,
      exercises: workout.exercises as unknown as Json,
      created_at: workout.createdAt instanceof Date
        ? workout.createdAt.toISOString()
        : String(workout.createdAt),
    };
    await tryOrQueue('workouts', 'upsert', payload as Record<string, unknown>, async () => {
      const { error } = await supabase.from('workouts').upsert(payload, { onConflict: 'user_id,workout_id' });
      if (error) throw error;
    });
  }, [user, tryOrQueue]);

  const pushExercise = useCallback(async (exercise: Exercise) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      exercise_id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscles.join(' / '),
      category: exercise.category,
      description: exercise.description,
      is_custom: true,
      is_override: false,
    };
    await tryOrQueue('exercises', 'upsert', payload, async () => {
      const { error } = await supabase.from('exercises').upsert(payload, { onConflict: 'user_id,exercise_id' });
      if (error) throw error;
    });
  }, [user, tryOrQueue]);

  const pushWorkoutLog = useCallback(async (log: WorkoutLog) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      history_id: log.id,
      workout_template_id: log.workoutId,
      workout_name: log.workoutName,
      completed_at: log.completedAt instanceof Date
        ? log.completedAt.toISOString()
        : String(log.completedAt),
      duration: log.duration,
      exercises: log.exercises as unknown as Json,
    };
    await tryOrQueue('workout_history', 'upsert', payload as Record<string, unknown>, async () => {
      const { error } = await supabase.from('workout_history').upsert(payload, { onConflict: 'user_id,history_id' });
      if (error) throw error;
    });
  }, [user, tryOrQueue]);

  const syncDeleteWorkout = useCallback(async (workoutId: string) => {
    if (!user) return;
    const payload = { user_id: user.id, workout_id: workoutId };
    await tryOrQueue('workouts', 'delete', payload, async () => {
      const { error } = await supabase.from('workouts').delete().eq('user_id', user.id).eq('workout_id', workoutId);
      if (error) throw error;
    });
  }, [user, tryOrQueue]);

  const syncDeleteExercise = useCallback(async (exerciseId: string) => {
    if (!user) return;
    const payload = { user_id: user.id, exercise_id: exerciseId };
    await tryOrQueue('exercises', 'delete', payload, async () => {
      const { error } = await supabase.from('exercises').delete().eq('user_id', user.id).eq('exercise_id', exerciseId);
      if (error) throw error;
    });
  }, [user, tryOrQueue]);

  const syncDeleteHistory = useCallback(async (historyId: string) => {
    if (!user) return;
    const payload = { user_id: user.id, history_id: historyId };
    await tryOrQueue('workout_history', 'delete', payload, async () => {
      const { error } = await supabase.from('workout_history').delete().eq('user_id', user.id).eq('history_id', historyId);
      if (error) throw error;
    });
  }, [user, tryOrQueue]);

  const pushWorkoutPlan = useCallback(async (plan: WorkoutPlan) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      plan_id: plan.planId,
      name: plan.name,
      start_date: plan.startDate,
      end_date: plan.endDate,
      weekly_assignments: plan.weeklyAssignments as unknown as Json,
      exceptions: plan.exceptions as unknown as Json,
      is_active: plan.isActive ?? false,
    };
    await tryOrQueue('workout_plans', 'upsert', payload as Record<string, unknown>, async () => {
      const { error } = await supabase.from('workout_plans').upsert(payload, { onConflict: 'user_id,plan_id' });
      if (error) throw error;
    });
  }, [user, tryOrQueue]);

  const syncDeletePlan = useCallback(async (planId: string) => {
    if (!user) return;
    const payload = { user_id: user.id, plan_id: planId };
    await tryOrQueue('workout_plans', 'delete', payload, async () => {
      const { error } = await supabase.from('workout_plans').delete().eq('user_id', user.id).eq('plan_id', planId);
      if (error) throw error;
    });
  }, [user, tryOrQueue]);

  // Upload ALL local data to cloud (first-time user)
  const uploadAllToCloud = useCallback(async () => {
    if (!user || syncInProgress.current) return;
    syncInProgress.current = true;
    try {
      for (const exercise of customExercises) await pushExercise(exercise);
      for (const workout of workouts) await pushWorkout(workout);
      for (const log of workoutLogs) await pushWorkoutLog(log);
      for (const plan of workoutPlans) await pushWorkoutPlan(plan);
      lastSyncTime.current = Date.now();
    } catch (error) {
      console.error('Upload to cloud failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [user, customExercises, workouts, workoutLogs, workoutPlans, pushExercise, pushWorkout, pushWorkoutLog, pushWorkoutPlan]);

  // Download cloud data and replace local state (ONE-TIME on initial login)
  const hydrateFromCloud = useCallback(async () => {
    if (!user || syncInProgress.current || hasHydrated.current) return;
    syncInProgress.current = true;
    try {
      const { data: cloudExercises } = await supabase.from('exercises').select('*').eq('user_id', user.id);
      if (cloudExercises && cloudExercises.length > 0) {
        const exercises: Exercise[] = cloudExercises.map((e) => {
          const muscles = e.muscle_group.split(' / ').map((s: string) => s.trim()).filter(Boolean);
          return {
            id: e.exercise_id, name: e.name, muscles,
            keywords: generateKeywords(e.name, muscles),
            isDefault: false, muscleGroup: muscles[0] || e.muscle_group,
            category: e.category || muscleToCategory(muscles[0] || ''),
            description: e.description || e.name, isCustom: e.is_custom,
          };
        });
        useWorkoutStore.setState({ customExercises: exercises });
      }

      const { data: cloudWorkouts } = await supabase.from('workouts').select('*').eq('user_id', user.id);
      if (cloudWorkouts && cloudWorkouts.length > 0) {
        const workoutsData: Workout[] = cloudWorkouts.map((w) => ({
          id: w.workout_id, name: w.name,
          exercises: w.exercises as unknown as Workout['exercises'],
          createdAt: new Date(w.created_at),
        }));
        useWorkoutStore.setState({ workouts: workoutsData });
      }

      const { data: cloudHistory } = await supabase.from('workout_history').select('*').eq('user_id', user.id).order('completed_at', { ascending: false });
      if (cloudHistory && cloudHistory.length > 0) {
        const historyData: WorkoutLog[] = cloudHistory.map((h) => ({
          id: h.history_id, workoutId: h.workout_template_id || '',
          workoutName: h.workout_name, completedAt: new Date(h.completed_at),
          duration: h.duration, exercises: h.exercises as unknown as WorkoutLog['exercises'],
        }));
        useWorkoutStore.setState({ workoutLogs: historyData });
      }

      // Load ALL plans (multi-plan support)
      const { data: cloudPlans } = await supabase.from('workout_plans').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      if (cloudPlans && cloudPlans.length > 0) {
        const plansData: WorkoutPlan[] = cloudPlans.map((p) => ({
          id: p.id, planId: p.plan_id, name: p.name,
          startDate: p.start_date, endDate: p.end_date,
          weeklyAssignments: p.weekly_assignments as unknown as WeeklyAssignments,
          exceptions: (p.exceptions as unknown as PlanException[]) || [],
          createdAt: new Date(p.created_at), updatedAt: new Date(p.updated_at),
          isActive: p.is_active ?? false,
        }));
        
        // Find active plan or default to first
        const activePlan = plansData.find((p) => p.isActive) || plansData[0];
        useWorkoutStore.setState({ 
          workoutPlans: plansData,
          activePlanId: activePlan?.planId || null,
        });
      }

      hasHydrated.current = true;
      lastSyncTime.current = Date.now();
      toast({ title: 'Synced!', description: 'Your data has been restored from the cloud.' });
    } catch (error) {
      console.error('Hydration from cloud failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [user, toast]);

  // Initial sync on login
  useEffect(() => {
    if (!user || !session || hasHydrated.current) return;
    if (!isOnline()) {
      // Offline at login - skip hydration, use local data
      hasHydrated.current = true;
      return;
    }

    const performInitialSync = async () => {
      const { count } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: exerciseCount } = await supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: historyCount } = await supabase.from('workout_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: planCount } = await supabase.from('workout_plans').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

      const hasCloudData = (count && count > 0) || (exerciseCount && exerciseCount > 0) || (historyCount && historyCount > 0) || (planCount && planCount > 0);

      if (hasCloudData) {
        await hydrateFromCloud();
      } else {
        hasHydrated.current = true;
        await uploadAllToCloud();
      }
    };

    performInitialSync();
  }, [user, session, hydrateFromCloud, uploadAllToCloud]);

  return {
    pushWorkout, pushExercise, pushWorkoutLog, pushWorkoutPlan,
    syncDeleteWorkout, syncDeleteExercise, syncDeleteHistory, syncDeletePlan,
    pushWorkoutUpdate: pushWorkout,
  };
}
