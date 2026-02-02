import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workout, WorkoutLog, Exercise } from '@/types/workout';

interface WorkoutState {
  workouts: Workout[];
  workoutLogs: WorkoutLog[];
  customExercises: Exercise[];
  customMuscleGroups: string[];
  exerciseMuscleOverrides: Record<string, string>; // exerciseId -> muscleGroup
  addWorkout: (workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  addWorkoutLog: (log: WorkoutLog) => void;
  deleteWorkoutLog: (id: string) => void;
  addCustomExercise: (exercise: Exercise) => void;
  deleteCustomExercise: (id: string) => void;
  addCustomMuscleGroup: (muscleGroup: string) => void;
  setExerciseMuscleGroup: (exerciseId: string, muscleGroup: string) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      workouts: [],
      workoutLogs: [],
      customExercises: [],
      customMuscleGroups: [],
      exerciseMuscleOverrides: {},
      addWorkout: (workout) =>
        set((state) => ({ workouts: [...state.workouts, workout] })),
      deleteWorkout: (id) =>
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
        })),
      addWorkoutLog: (log) =>
        set((state) => ({ workoutLogs: [log, ...state.workoutLogs] })),
      deleteWorkoutLog: (id) =>
        set((state) => ({
          workoutLogs: state.workoutLogs.filter((l) => l.id !== id),
        })),
      addCustomExercise: (exercise) =>
        set((state) => ({ customExercises: [...state.customExercises, exercise] })),
      deleteCustomExercise: (id) =>
        set((state) => ({
          customExercises: state.customExercises.filter((e) => e.id !== id),
        })),
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
    }),
    {
      name: 'workout-storage',
    }
  )
);
