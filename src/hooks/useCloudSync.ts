import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Workout, WorkoutLog, Exercise } from '@/types/workout';
import { Json } from '@/integrations/supabase/types';

export function useCloudSync() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef<number>(0);

  // Get store state
  const workouts = useWorkoutStore((state) => state.workouts);
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const customExercises = useWorkoutStore((state) => state.customExercises);

  // Upload local data to cloud (first-time login)
  const uploadToCloud = useCallback(async () => {
    if (!user || syncInProgress.current) return;
    
    syncInProgress.current = true;
    
    try {
      // Upload custom exercises
      for (const exercise of customExercises) {
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
      }

      // Upload workouts
      for (const workout of workouts) {
        await supabase.from('workouts').upsert({
          user_id: user.id,
          workout_id: workout.id,
          name: workout.name,
          exercises: workout.exercises as unknown as Json,
          created_at: workout.createdAt instanceof Date 
            ? workout.createdAt.toISOString() 
            : String(workout.createdAt),
        }, { onConflict: 'user_id,workout_id' });
      }

      // Upload workout history
      for (const log of workoutLogs) {
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
      }

      lastSyncTime.current = Date.now();
    } catch (error) {
      console.error('Upload to cloud failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [user, customExercises, workouts, workoutLogs]);

  // Download cloud data and replace local state
  const downloadFromCloud = useCallback(async () => {
    if (!user || syncInProgress.current) return;
    
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
        
        // Replace local custom exercises
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

      lastSyncTime.current = Date.now();
      toast({
        title: 'Synced!',
        description: 'Your data has been restored from the cloud.',
      });
    } catch (error) {
      console.error('Download from cloud failed:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [user, toast]);

  // Initial sync on login
  useEffect(() => {
    if (!user || !session) return;

    const performInitialSync = async () => {
      // Check if user has cloud data
      const { count } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count && count > 0) {
        // Returning user - download from cloud
        await downloadFromCloud();
      } else {
        // First-time login - upload local data
        await uploadToCloud();
      }
    };

    performInitialSync();
  }, [user, session, downloadFromCloud, uploadToCloud]);

  // Auto-sync on data changes (debounced)
  useEffect(() => {
    if (!user || !session) return;
    
    const debounceMs = 2000;
    const now = Date.now();
    
    if (now - lastSyncTime.current < debounceMs) return;
    
    const timeout = setTimeout(() => {
      uploadToCloud();
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [user, session, workouts, workoutLogs, customExercises, uploadToCloud]);

  // Function to sync a specific workout deletion
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

  return { uploadToCloud, downloadFromCloud, syncDeleteHistory };
}
