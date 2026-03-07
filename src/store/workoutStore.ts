import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workout, WorkoutLog, Exercise, WorkoutPlan, DayAssignment, DEFAULT_WEEKLY_ASSIGNMENTS } from '@/types/workout';
import { format } from 'date-fns';

interface WorkoutState {
  workouts: Workout[];
  workoutLogs: WorkoutLog[];
  customExercises: Exercise[];
  customMuscleGroups: string[];
  exerciseMuscleOverrides: Record<string, string>; // exerciseId -> muscleGroup
  workoutPlan: WorkoutPlan | null;
  
  // Sync callbacks (set by CloudSyncProvider)
  onWorkoutDeleted?: (workoutId: string) => void;
  onExerciseDeleted?: (exerciseId: string) => void;
  onHistoryDeleted?: (historyId: string) => void;
  onWorkoutAdded?: (workout: Workout) => void;
  onWorkoutUpdated?: (workout: Workout) => void;
  onExerciseAdded?: (exercise: Exercise) => void;
  onHistoryAdded?: (log: WorkoutLog) => void;
  onPlanUpdated?: (plan: WorkoutPlan) => void;
  
  // Actions
  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  addWorkoutLog: (log: WorkoutLog) => void;
  deleteWorkoutLog: (id: string) => void;
  addCustomExercise: (exercise: Exercise) => void;
  deleteCustomExercise: (id: string) => void;
  addCustomMuscleGroup: (muscleGroup: string) => void;
  setExerciseMuscleGroup: (exerciseId: string, muscleGroup: string) => void;
  setWorkoutPlan: (plan: WorkoutPlan) => void;
  updateDayAssignment: (dayOfWeek: number, assignment: DayAssignment) => void;
  addPlanException: (date: string, assignment: DayAssignment) => void;
  getTodayAssignment: () => DayAssignment;
  
  // Sync callback setters
  setSyncCallbacks: (callbacks: {
    onWorkoutDeleted?: (workoutId: string) => void;
    onExerciseDeleted?: (exerciseId: string) => void;
    onHistoryDeleted?: (historyId: string) => void;
    onWorkoutAdded?: (workout: Workout) => void;
    onWorkoutUpdated?: (workout: Workout) => void;
    onExerciseAdded?: (exercise: Exercise) => void;
    onHistoryAdded?: (log: WorkoutLog) => void;
    onPlanUpdated?: (plan: WorkoutPlan) => void;
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
      workoutPlan: null,
      
      // Sync callbacks (undefined until CloudSyncProvider sets them)
      onWorkoutDeleted: undefined,
      onExerciseDeleted: undefined,
      onHistoryDeleted: undefined,
      onWorkoutAdded: undefined,
      onExerciseAdded: undefined,
      onHistoryAdded: undefined,
      onPlanUpdated: undefined,
      
      addWorkout: (workout) => {
        set((state) => ({ workouts: [...state.workouts, workout] }));
        get().onWorkoutAdded?.(workout);
      },
      updateWorkout: (id, workout) => {
        set((state) => ({
          workouts: state.workouts.map((w) => w.id === id ? workout : w),
        }));
        get().onWorkoutUpdated?.(workout);
      },
      deleteWorkout: (id) => {
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
        }));
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
      setWorkoutPlan: (plan) => {
        set({ workoutPlan: plan });
        get().onPlanUpdated?.(plan);
      },
      updateDayAssignment: (dayOfWeek, assignment) => {
        const state = get();
        const plan = state.workoutPlan;
        if (!plan) {
          // Create a new plan
          const newPlan: WorkoutPlan = {
            id: crypto.randomUUID(),
            planId: crypto.randomUUID(),
            name: 'My Plan',
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: null,
            weeklyAssignments: {
              ...DEFAULT_WEEKLY_ASSIGNMENTS,
              [String(dayOfWeek)]: assignment,
            },
            exceptions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set({ workoutPlan: newPlan });
          get().onPlanUpdated?.(newPlan);
        } else {
          const updatedPlan = {
            ...plan,
            weeklyAssignments: {
              ...plan.weeklyAssignments,
              [String(dayOfWeek)]: assignment,
            },
            updatedAt: new Date(),
          };
          set({ workoutPlan: updatedPlan });
          get().onPlanUpdated?.(updatedPlan);
        }
      },
      addPlanException: (date, assignment) => {
        const state = get();
        const plan = state.workoutPlan;
        if (!plan) {
          // Create a new plan with exception
          const newPlan: WorkoutPlan = {
            id: crypto.randomUUID(),
            planId: crypto.randomUUID(),
            name: 'My Plan',
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: null,
            weeklyAssignments: DEFAULT_WEEKLY_ASSIGNMENTS,
            exceptions: [{ date, type: assignment.type, workoutId: assignment.workoutId }],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          set({ workoutPlan: newPlan });
          get().onPlanUpdated?.(newPlan);
        } else {
          // Update existing exception or add new one
          const existingExceptionIndex = plan.exceptions.findIndex((e) => e.date === date);
          const updatedExceptions = [...plan.exceptions];
          if (existingExceptionIndex >= 0) {
            updatedExceptions[existingExceptionIndex] = { date, type: assignment.type, workoutId: assignment.workoutId };
          } else {
            updatedExceptions.push({ date, type: assignment.type, workoutId: assignment.workoutId });
          }
          const updatedPlan = {
            ...plan,
            exceptions: updatedExceptions,
            updatedAt: new Date(),
          };
          set({ workoutPlan: updatedPlan });
          get().onPlanUpdated?.(updatedPlan);
        }
      },
      getTodayAssignment: () => {
        const state = get();
        const plan = state.workoutPlan;
        const today = format(new Date(), 'yyyy-MM-dd');
        const dayOfWeek = new Date().getDay();
        
        if (!plan) {
          return { type: 'Empty', workoutId: null };
        }
        
        // Check exceptions first
        const exception = plan.exceptions.find((e) => e.date === today);
        if (exception) {
          return { type: exception.type, workoutId: exception.workoutId };
        }
        
        // Fall back to weekly assignment
        return plan.weeklyAssignments[String(dayOfWeek) as keyof typeof plan.weeklyAssignments];
      },
      setSyncCallbacks: (callbacks) => set(callbacks),
    }),
    {
      name: 'workout-storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState) {
          const state = persistedState as any;
          if (state.customExercises) {
            state.customExercises = state.customExercises.map((e: any) => ({
              ...e,
              muscles: e.muscles || [e.muscleGroup || 'Other'].filter(Boolean),
              keywords: e.keywords || [],
              isDefault: e.isDefault ?? false,
              description: e.description || e.name || '',
              category: e.category || 'other',
              muscleGroup: e.muscleGroup || (e.muscles?.[0]) || 'Other',
            }));
          }
        }
        return persistedState as WorkoutState;
      },
      partialize: (state) => ({
        workouts: state.workouts,
        workoutLogs: state.workoutLogs,
        customExercises: state.customExercises,
        customMuscleGroups: state.customMuscleGroups,
        exerciseMuscleOverrides: state.exerciseMuscleOverrides,
        workoutPlan: state.workoutPlan,
      }),
    }
  )
);
