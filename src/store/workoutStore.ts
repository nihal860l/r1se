import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workout, WorkoutLog } from '@/types/workout';

interface WorkoutState {
  workouts: Workout[];
  workoutLogs: WorkoutLog[];
  addWorkout: (workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  addWorkoutLog: (log: WorkoutLog) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      workouts: [],
      workoutLogs: [],
      addWorkout: (workout) =>
        set((state) => ({ workouts: [...state.workouts, workout] })),
      deleteWorkout: (id) =>
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
        })),
      addWorkoutLog: (log) =>
        set((state) => ({ workoutLogs: [log, ...state.workoutLogs] })),
    }),
    {
      name: 'workout-storage',
    }
  )
);
