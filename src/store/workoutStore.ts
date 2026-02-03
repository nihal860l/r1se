import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workout, WorkoutLog, Exercise } from '@/types/workout';

interface WorkoutState {
  workouts: Workout[];
  workoutLogs: WorkoutLog[];
  customExercises: Exercise[];
  customMuscleGroups: string[];
  exerciseMuscleOverrides: Record<string, string>; // exerciseId -> muscleGroup
  
  // Sync callbacks (set by CloudSyncProvider)
  onWorkoutDeleted?: (workoutId: string) => void;
  onExerciseDeleted?: (exerciseId: string) => void;
  onHistoryDeleted?: (historyId: string) => void;
  onWorkoutAdded?: (workout: Workout) => void;
  onExerciseAdded?: (exercise: Exercise) => void;
  onHistoryAdded?: (log: WorkoutLog) => void;
  
  // Actions
  addWorkout: (workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  addWorkoutLog: (log: WorkoutLog) => void;
  deleteWorkoutLog: (id: string) => void;
  addCustomExercise: (exercise: Exercise) => void;
  deleteCustomExercise: (id: string) => void;
  addCustomMuscleGroup: (muscleGroup: string) => void;
  setExerciseMuscleGroup: (exerciseId: string, muscleGroup: string) => void;
  
  // Sync callback setters
  setSyncCallbacks: (callbacks: {
    onWorkoutDeleted?: (workoutId: string) => void;
    onExerciseDeleted?: (exerciseId: string) => void;
    onHistoryDeleted?: (historyId: string) => void;
    onWorkoutAdded?: (workout: Workout) => void;
    onExerciseAdded?: (exercise: Exercise) => void;
    onHistoryAdded?: (log: WorkoutLog) => void;
  }) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      workoutLogs: [],
      customExercises: [],
      customMuscleGroups: [],
      exerciseMuscleOverrides: {},
      
      // Sync callbacks (undefined until CloudSyncProvider sets them)
      onWorkoutDeleted: undefined,
      onExerciseDeleted: undefined,
      onHistoryDeleted: undefined,
      onWorkoutAdded: undefined,
      onExerciseAdded: undefined,
      onHistoryAdded: undefined,
      
      addWorkout: (workout) => {
        set((state) => ({ workouts: [...state.workouts, workout] }));
        // Trigger sync callback
        get().onWorkoutAdded?.(workout);
      },
      deleteWorkout: (id) => {
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
        }));
        // Trigger sync callback
        get().onWorkoutDeleted?.(id);
      },
      addWorkoutLog: (log) => {
        set((state) => ({ workoutLogs: [log, ...state.workoutLogs] }));
        // Trigger sync callback
        get().onHistoryAdded?.(log);
      },
      deleteWorkoutLog: (id) => {
        set((state) => ({
          workoutLogs: state.workoutLogs.filter((l) => l.id !== id),
        }));
        // Trigger sync callback
        get().onHistoryDeleted?.(id);
      },
      addCustomExercise: (exercise) => {
        set((state) => ({ customExercises: [...state.customExercises, exercise] }));
        // Trigger sync callback
        get().onExerciseAdded?.(exercise);
      },
      deleteCustomExercise: (id) => {
        set((state) => ({
          customExercises: state.customExercises.filter((e) => e.id !== id),
        }));
        // Trigger sync callback
        get().onExerciseDeleted?.(id);
      },
      addCustomMuscleGroup: (muscleGroup) =>
        set((state) => ({
          customMuscleGroups: state.customMuscleGroups.includes(muscleGroup)
            ? state.customMuscleGroups
            : [...state.customMuscleGroups, muscleGroup],
        })),
      setExerciseMuscleGroup: (exerciseId, muscleGroup) =>
        set((state) => ({
          exerciseMuscleOverrides: {
            ...state.exerciseMuscleOverrides,
            [exerciseId]: muscleGroup,
          },
        })),
      setSyncCallbacks: (callbacks) => set(callbacks),
    }),
    {
      name: 'workout-storage',
      partialize: (state) => ({
        workouts: state.workouts,
        workoutLogs: state.workoutLogs,
        customExercises: state.customExercises,
        customMuscleGroups: state.customMuscleGroups,
        exerciseMuscleOverrides: state.exerciseMuscleOverrides,
      }),
    }
  )
);
