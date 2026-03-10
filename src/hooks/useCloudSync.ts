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

  // MERGE cloud + local data (never overwrites local changes)
  const mergeFromCloud = useCallback(async () => {
    if (!user || syncInProgress.current) return;
    if (hasUserHydrated(user.id)) return;
    syncInProgress.current = true;
    try {
      const localState = useWorkoutStore.getState();

      // --- Exercises: merge by exercise_id ---
      const { data: cloudExercises } = await supabase.from('exercises').select('*').eq('user_id', user.id);
      const cloudExMap = new Map((cloudExercises || []).map(e => [e.exercise_id, e]));
      const localExMap = new Map(localState.customExercises.map(e => [e.id, e]));

      // Cloud-only exercises → add to local
      const mergedExercises = [...localState.customExercises];
      for (const ce of (cloudExercises || [])) {
        if (!localExMap.has(ce.exercise_id)) {
          const muscles = ce.muscle_group.split(' / ').map((s: string) => s.trim()).filter(Boolean);
          mergedExercises.push({
            id: ce.exercise_id, name: ce.name, muscles,
            keywords: generateKeywords(ce.name, muscles),
            isDefault: false, muscleGroup: muscles[0] || ce.muscle_group,
            category: ce.category || muscleToCategory(muscles[0] || ''),
            description: ce.description || ce.name, isCustom: ce.is_custom,
          });
        }
      }
      useWorkoutStore.setState({ customExercises: mergedExercises });
      // Local-only exercises → push to cloud
      for (const le of localState.customExercises) {
        if (!cloudExMap.has(le.id)) await pushExercise(le);
      }

      // --- Workouts: merge by workout_id ---
      const { data: cloudWorkouts } = await supabase.from('workouts').select('*').eq('user_id', user.id);
      const cloudWkMap = new Map((cloudWorkouts || []).map(w => [w.workout_id, w]));
      const localWkMap = new Map(localState.workouts.map(w => [w.id, w]));

      const mergedWorkouts = [...localState.workouts];
      for (const cw of (cloudWorkouts || [])) {
        if (!localWkMap.has(cw.workout_id)) {
          mergedWorkouts.push({
            id: cw.workout_id, name: cw.name,
            exercises: cw.exercises as unknown as Workout['exercises'],
            createdAt: new Date(cw.created_at),
          });
        }
      }
      useWorkoutStore.setState({ workouts: mergedWorkouts });
      for (const lw of localState.workouts) {
        if (!cloudWkMap.has(lw.id)) await pushWorkout(lw);
      }

      // --- History: merge by history_id ---
      const { data: cloudHistory } = await supabase.from('workout_history').select('*').eq('user_id', user.id);
      const cloudHMap = new Map((cloudHistory || []).map(h => [h.history_id, h]));
      const localHMap = new Map(localState.workoutLogs.map(h => [h.id, h]));

      const mergedHistory = [...localState.workoutLogs];
      for (const ch of (cloudHistory || [])) {
        if (!localHMap.has(ch.history_id)) {
          mergedHistory.push({
            id: ch.history_id, workoutId: ch.workout_template_id || '',
            workoutName: ch.workout_name, completedAt: new Date(ch.completed_at),
            duration: ch.duration, exercises: ch.exercises as unknown as WorkoutLog['exercises'],
          });
        }
      }
      useWorkoutStore.setState({ workoutLogs: mergedHistory });
      for (const lh of localState.workoutLogs) {
        if (!cloudHMap.has(lh.id)) await pushWorkoutLog(lh);
      }

      // --- Plans: merge by plan_id, latest updatedAt wins for conflicts ---
      const { data: cloudPlans } = await supabase.from('workout_plans').select('*').eq('user_id', user.id);
      const cloudPlanMap = new Map((cloudPlans || []).map(p => [p.plan_id, p]));
      const localPlanMap = new Map(localState.workoutPlans.map(p => [p.planId, p]));

      const mergedPlans: WorkoutPlan[] = [];
      // Start with local plans (prefer local if newer or same)
      for (const lp of localState.workoutPlans) {
        const cp = cloudPlanMap.get(lp.planId);
        if (!cp) {
          mergedPlans.push(lp);
          await pushWorkoutPlan(lp); // upload local-only plan
        } else {
          const localTime = lp.updatedAt instanceof Date ? lp.updatedAt.getTime() : new Date(lp.updatedAt as any).getTime();
          const cloudTime = new Date(cp.updated_at).getTime();
          if (localTime >= cloudTime) {
            mergedPlans.push(lp);
            await pushWorkoutPlan(lp); // push newer local version
          } else {
            mergedPlans.push({
              id: cp.id, planId: cp.plan_id, name: cp.name,
              startDate: cp.start_date, endDate: cp.end_date,
              weeklyAssignments: cp.weekly_assignments as unknown as WeeklyAssignments,
              exceptions: (cp.exceptions as unknown as PlanException[]) || [],
              createdAt: new Date(cp.created_at), updatedAt: new Date(cp.updated_at),
              isActive: cp.is_active ?? false,
            });
          }
        }
      }
      // Cloud-only plans → add to local
      for (const cp of (cloudPlans || [])) {
        if (!localPlanMap.has(cp.plan_id)) {
          mergedPlans.push({
            id: cp.id, planId: cp.plan_id, name: cp.name,
            startDate: cp.start_date, endDate: cp.end_date,
            weeklyAssignments: cp.weekly_assignments as unknown as WeeklyAssignments,
            exceptions: (cp.exceptions as unknown as PlanException[]) || [],
            createdAt: new Date(cp.created_at), updatedAt: new Date(cp.updated_at),
            isActive: cp.is_active ?? false,
          });
        }
      }

      const activePlan = mergedPlans.find(p => p.isActive) || mergedPlans[0];
      useWorkoutStore.setState({
        workoutPlans: mergedPlans,
        activePlanId: activePlan?.planId || localState.activePlanId,
      });

      setUserHydrated(user.id);
      lastSyncTime.current = Date.now();
      toast({ title: 'Synced!', description: 'Your data has been merged with the cloud.' });
    } catch (error) {
      console.error('Merge from cloud failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [user, toast, pushExercise, pushWorkout, pushWorkoutLog, pushWorkoutPlan]);

  // Initial sync on login - merge-based
  useEffect(() => {
    if (!user || !session) return;
    if (hasUserHydrated(user.id)) return;
    if (!isOnline()) return; // will sync when back online via queue processor

    const performInitialSync = async () => {
      const { count } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: exerciseCount } = await supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: historyCount } = await supabase.from('workout_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: planCount } = await supabase.from('workout_plans').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

      const hasCloudData = (count && count > 0) || (exerciseCount && exerciseCount > 0) || (historyCount && historyCount > 0) || (planCount && planCount > 0);

      if (hasCloudData) {
        await mergeFromCloud();
      } else {
        setUserHydrated(user.id);
        await uploadAllToCloud();
      }
    };

    performInitialSync();
  }, [user, session, mergeFromCloud, uploadAllToCloud]);

  return {
    pushWorkout, pushExercise, pushWorkoutLog, pushWorkoutPlan,
    syncDeleteWorkout, syncDeleteExercise, syncDeleteHistory, syncDeletePlan,
    pushWorkoutUpdate: pushWorkout,
  };
}
