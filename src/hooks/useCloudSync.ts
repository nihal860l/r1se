import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Workout, WorkoutLog, Exercise } from '@/types/workout';
import { Json } from '@/integrations/supabase/types';

/**
 * MERGE-AWARE CLOUD SYNC
 * 
 * Core Rule: Once logged in, cloud NEVER blindly overwrites local state.
 * 
 * 1. Initial login (one-time): Replace local with cloud data, set isHydratedFromCloud = true
 * 2. After hydration: Only push local changes to cloud, never pull/replace
 * 3. Deletions: Delete from local + push deletion to cloud, no re-fetch
 */

export function useCloudSync() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef<number>(0);
  
  // Track if we've already hydrated from cloud this session
  const hasHydrated = useRef(false);

  // Get store state
  const workouts = useWorkoutStore((state) => state.workouts);
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const customExercises = useWorkoutStore((state) => state.customExercises);

  // Push a single workout to cloud
  const pushWorkout = useCallback(async (workout: Workout) => {
    if (!user) return;
    
    try {
      await supabase.from('workouts').upsert({
        user_id: user.id,
        workout_id: workout.id,
        name: workout.name,
        exercises: workout.exercises as unknown as Json,
        created_at: workout.createdAt instanceof Date 
          ? workout.createdAt.toISOString() 
          : String(workout.createdAt),
      }, { onConflict: 'user_id,workout_id' });
    } catch (error) {
      console.error('Failed to push workout to cloud:', error);
    }
  }, [user]);

  // Push a single exercise to cloud
  const pushExercise = useCallback(async (exercise: Exercise) => {
    if (!user) return;
    
    try {
      await supabase.from('exercises').upsert({
        user_id: user.id,
        exercise_id: exercise.id,
        name: exercise.name,
        muscle_group: exercise.muscleGroup,
        category: exercise.category,
        description: exercise.description,
        is_custom: true,
        is_override: false,
      }, { onConflict: 'user_id,exercise_id' });
    } catch (error) {
      console.error('Failed to push exercise to cloud:', error);
    }
  }, [user]);

  // Push a single workout log to cloud
  const pushWorkoutLog = useCallback(async (log: WorkoutLog) => {
    if (!user) return;
    
    try {
      await supabase.from('workout_history').upsert({
        user_id: user.id,
        history_id: log.id,
        workout_template_id: log.workoutId,
        workout_name: log.workoutName,
        completed_at: log.completedAt instanceof Date 
          ? log.completedAt.toISOString() 
          : String(log.completedAt),
        duration: log.duration,
        exercises: log.exercises as unknown as Json,
      }, { onConflict: 'user_id,history_id' });
    } catch (error) {
      console.error('Failed to push workout log to cloud:', error);
    }
  }, [user]);

  // Delete workout from cloud
  const syncDeleteWorkout = useCallback(async (workoutId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('workouts')
        .delete()
        .eq('user_id', user.id)
        .eq('workout_id', workoutId);
    } catch (error) {
      console.error('Failed to delete workout from cloud:', error);
    }
  }, [user]);

  // Delete exercise from cloud
  const syncDeleteExercise = useCallback(async (exerciseId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('exercises')
        .delete()
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId);
    } catch (error) {
      console.error('Failed to delete exercise from cloud:', error);
    }
  }, [user]);

  // Delete workout history from cloud
  const syncDeleteHistory = useCallback(async (historyId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('workout_history')
        .delete()
        .eq('user_id', user.id)
        .eq('history_id', historyId);
    } catch (error) {
      console.error('Failed to delete history from cloud:', error);
    }
  }, [user]);

  // Upload ALL local data to cloud (first-time user)
  const uploadAllToCloud = useCallback(async () => {
    if (!user || syncInProgress.current) return;
    
    syncInProgress.current = true;
    
    try {
      // Upload custom exercises
      for (const exercise of customExercises) {
        await pushExercise(exercise);
      }

      // Upload workouts
      for (const workout of workouts) {
        await pushWorkout(workout);
      }

      // Upload workout history
      for (const log of workoutLogs) {
        await pushWorkoutLog(log);
      }

      lastSyncTime.current = Date.now();
    } catch (error) {
      console.error('Upload to cloud failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [user, customExercises, workouts, workoutLogs, pushExercise, pushWorkout, pushWorkoutLog]);

  // Download cloud data and replace local state (ONE-TIME on initial login)
  const hydrateFromCloud = useCallback(async () => {
    if (!user || syncInProgress.current || hasHydrated.current) return;
    
    syncInProgress.current = true;
    
    try {
      // Fetch exercises
      const { data: cloudExercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id);

      if (cloudExercises && cloudExercises.length > 0) {
        const exercises: Exercise[] = cloudExercises.map((e) => ({
          id: e.exercise_id,
          name: e.name,
          muscleGroup: e.muscle_group,
          category: e.category as Exercise['category'],
          description: e.description || '',
          isCustom: e.is_custom,
        }));
        
        useWorkoutStore.setState({ customExercises: exercises });
      }

      // Fetch workouts
      const { data: cloudWorkouts } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id);

      if (cloudWorkouts && cloudWorkouts.length > 0) {
        const workoutsData: Workout[] = cloudWorkouts.map((w) => ({
          id: w.workout_id,
          name: w.name,
          exercises: w.exercises as unknown as Workout['exercises'],
          createdAt: new Date(w.created_at),
        }));
        
        useWorkoutStore.setState({ workouts: workoutsData });
      }

      // Fetch workout history
      const { data: cloudHistory } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (cloudHistory && cloudHistory.length > 0) {
        const historyData: WorkoutLog[] = cloudHistory.map((h) => ({
          id: h.history_id,
          workoutId: h.workout_template_id || '',
          workoutName: h.workout_name,
          completedAt: new Date(h.completed_at),
          duration: h.duration,
          exercises: h.exercises as unknown as WorkoutLog['exercises'],
        }));
        
        useWorkoutStore.setState({ workoutLogs: historyData });
      }

      hasHydrated.current = true;
      lastSyncTime.current = Date.now();
      
      toast({
        title: 'Synced!',
        description: 'Your data has been restored from the cloud.',
      });
    } catch (error) {
      console.error('Hydration from cloud failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [user, toast]);

  // Initial sync on login - RUNS ONCE PER SESSION
  useEffect(() => {
    if (!user || !session || hasHydrated.current) return;

    const performInitialSync = async () => {
      // Check if user has cloud data
      const { count } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: exerciseCount } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: historyCount } = await supabase
        .from('workout_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const hasCloudData = (count && count > 0) || (exerciseCount && exerciseCount > 0) || (historyCount && historyCount > 0);

      if (hasCloudData) {
        // Returning user - hydrate from cloud (ONE-TIME)
        await hydrateFromCloud();
      } else {
        // First-time login - upload local data to cloud
        hasHydrated.current = true; // Mark as hydrated to prevent future re-hydration
        await uploadAllToCloud();
      }
    };

    performInitialSync();
  }, [user, session, hydrateFromCloud, uploadAllToCloud]);

  return { 
    pushWorkout, 
    pushExercise, 
    pushWorkoutLog,
    syncDeleteWorkout,
    syncDeleteExercise,
    syncDeleteHistory,
  };
}
