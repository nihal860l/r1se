import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workout, WorkoutLog, Exercise } from '@/types/workout';

interface WorkoutState {
  workouts: Workout[];
  workoutLogs: WorkoutLog[];
  customExercises: Exercise[];
  addWorkout: (workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  addWorkoutLog: (log: WorkoutLog) => void;
  addCustomExercise: (exercise: Exercise) => void;
  deleteCustomExercise: (id: string) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      workouts: [],
      workoutLogs: [],
      customExercises: [],
      addWorkout: (workout) =>
        set((state) => ({ workouts: [...state.workouts, workout] })),
      deleteWorkout: (id) =>
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
        })),
      addWorkoutLog: (log) =>
        set((state) => ({ workoutLogs: [log, ...state.workoutLogs] })),
      addCustomExercise: (exercise) =>
        set((state) => ({ customExercises: [...state.customExercises, exercise] })),
      deleteCustomExercise: (id) =>
        set((state) => ({
          customExercises: state.customExercises.filter((e) => e.id !== id),
        })),
    }),
    {
      name: 'workout-storage',
    }
  )
);
