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
  workoutPlans: WorkoutPlan[];
  activePlanId: string | null;
  
  // Legacy: single plan (for migration)
  workoutPlan: WorkoutPlan | null;
  
  // Sync callbacks (set by CloudSyncProvider)
  onWorkoutDeleted?: (workoutId: string) => void;
  onExerciseDeleted?: (exerciseId: string) => void;
  onHistoryDeleted?: (historyId: string) => void;
  onWorkoutAdded?: (workout: Workout) => void;
  onWorkoutUpdated?: (workout: Workout) => void;
  onExerciseAdded?: (exercise: Exercise) => void;
  onHistoryAdded?: (log: WorkoutLog) => void;
  onHistoryUpdated?: (log: WorkoutLog) => void;
  onPlanUpdated?: (plan: WorkoutPlan) => void;
  onPlanDeleted?: (planId: string) => void;
  
  // Actions
  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  addWorkoutLog: (log: WorkoutLog) => void;
  updateWorkoutLog: (id: string, log: WorkoutLog) => void;
  deleteWorkoutLog: (id: string) => void;
  addCustomExercise: (exercise: Exercise) => void;
  deleteCustomExercise: (id: string) => void;
  addCustomMuscleGroup: (muscleGroup: string) => void;
  setExerciseMuscleGroup: (exerciseId: string, muscleGroup: string) => void;
  
  // Multi-plan actions
  addWorkoutPlan: (plan: WorkoutPlan) => void;
  updateWorkoutPlan: (planId: string, updates: Partial<WorkoutPlan>) => void;
  deleteWorkoutPlan: (planId: string) => void;
  setActivePlan: (planId: string) => void;
  getActivePlan: () => WorkoutPlan | null;
  updateDayAssignment: (dayOfWeek: number, assignment: DayAssignment) => void;
  addPlanException: (date: string, assignment: DayAssignment) => void;
  getTodayAssignment: () => DayAssignment;
  
  // Legacy (kept for backwards compat)
  setWorkoutPlan: (plan: WorkoutPlan) => void;
  
  // Sync callback setters
  setSyncCallbacks: (callbacks: {
    onWorkoutDeleted?: (workoutId: string) => void;
    onExerciseDeleted?: (exerciseId: string) => void;
    onHistoryDeleted?: (historyId: string) => void;
    onWorkoutAdded?: (workout: Workout) => void;
    onWorkoutUpdated?: (workout: Workout) => void;
    onExerciseAdded?: (exercise: Exercise) => void;
    onHistoryAdded?: (log: WorkoutLog) => void;
    onHistoryUpdated?: (log: WorkoutLog) => void;
    onPlanUpdated?: (plan: WorkoutPlan) => void;
    onPlanDeleted?: (planId: string) => void;
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
      workoutPlans: [],
      activePlanId: null,
      workoutPlan: null,
      
      // Sync callbacks (undefined until CloudSyncProvider sets them)
      onWorkoutDeleted: undefined,
      onExerciseDeleted: undefined,
      onHistoryDeleted: undefined,
      onWorkoutAdded: undefined,
      onExerciseAdded: undefined,
      onHistoryAdded: undefined,
      onHistoryUpdated: undefined,
      onPlanUpdated: undefined,
      onPlanDeleted: undefined,
      
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
        get().onHistoryAdded?.(log);
      },
      updateWorkoutLog: (id, log) => {
        set((state) => ({
          workoutLogs: state.workoutLogs.map((l) => l.id === id ? log : l),
        }));
        get().onHistoryUpdated?.(log);
      },
      deleteWorkoutLog: (id) => {
        set((state) => ({
          workoutLogs: state.workoutLogs.filter((l) => l.id !== id),
        }));
        get().onHistoryDeleted?.(id);
      },
      addCustomExercise: (exercise) => {
        set((state) => ({ customExercises: [...state.customExercises, exercise] }));
        get().onExerciseAdded?.(exercise);
      },
      deleteCustomExercise: (id) => {
        set((state) => ({
          customExercises: state.customExercises.filter((e) => e.id !== id),
        }));
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
      
      // Multi-plan actions
      addWorkoutPlan: (plan) => {
        const state = get();
        const isFirst = state.workoutPlans.length === 0;
        const newPlan = { ...plan, isActive: isFirst };
        set((s) => ({
          workoutPlans: [...s.workoutPlans, newPlan],
          activePlanId: isFirst ? plan.planId : s.activePlanId,
        }));
        get().onPlanUpdated?.(newPlan);
      },
      
      updateWorkoutPlan: (planId, updates) => {
        set((state) => ({
          workoutPlans: state.workoutPlans.map((p) =>
            p.planId === planId ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        }));
        const updatedPlan = get().workoutPlans.find((p) => p.planId === planId);
        if (updatedPlan) get().onPlanUpdated?.(updatedPlan);
      },
      
      deleteWorkoutPlan: (planId) => {
        const state = get();
        const remainingPlans = state.workoutPlans.filter((p) => p.planId !== planId);
        const wasActive = state.activePlanId === planId;
        const newActivePlanId = wasActive && remainingPlans.length > 0 
          ? remainingPlans[0].planId 
          : wasActive ? null : state.activePlanId;
        
        set({
          workoutPlans: remainingPlans.map((p) => ({
            ...p,
            isActive: p.planId === newActivePlanId,
          })),
          activePlanId: newActivePlanId,
        });
        get().onPlanDeleted?.(planId);
      },
      
      setActivePlan: (planId) => {
        set((state) => ({
          activePlanId: planId,
          workoutPlans: state.workoutPlans.map((p) => ({
            ...p,
            isActive: p.planId === planId,
          })),
        }));
        const activePlan = get().workoutPlans.find((p) => p.planId === planId);
        if (activePlan) get().onPlanUpdated?.(activePlan);
      },
      
      getActivePlan: () => {
        const state = get();
        return state.workoutPlans.find((p) => p.planId === state.activePlanId) || null;
      },
      
      // Legacy single plan setter (redirects to multi-plan)
      setWorkoutPlan: (plan) => {
        const state = get();
        const existing = state.workoutPlans.find((p) => p.planId === plan.planId);
        if (existing) {
          get().updateWorkoutPlan(plan.planId, plan);
        } else {
          get().addWorkoutPlan(plan);
        }
      },
      
      updateDayAssignment: (dayOfWeek, assignment) => {
        const state = get();
        const activePlanId = state.activePlanId;
        
        if (!activePlanId) {
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
            isActive: true,
          };
          set({ workoutPlans: [newPlan], activePlanId: newPlan.planId });
          get().onPlanUpdated?.(newPlan);
        } else {
          const plan = state.workoutPlans.find((p) => p.planId === activePlanId);
          if (!plan) return;
          
          const updatedPlan = {
            ...plan,
            weeklyAssignments: {
              ...plan.weeklyAssignments,
              [String(dayOfWeek)]: assignment,
            },
            updatedAt: new Date(),
          };
          set((s) => ({
            workoutPlans: s.workoutPlans.map((p) => p.planId === activePlanId ? updatedPlan : p),
          }));
          get().onPlanUpdated?.(updatedPlan);
        }
      },
      
      addPlanException: (date, assignment) => {
        const state = get();
        const activePlanId = state.activePlanId;
        
        if (!activePlanId) {
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
            isActive: true,
          };
          set({ workoutPlans: [newPlan], activePlanId: newPlan.planId });
          get().onPlanUpdated?.(newPlan);
        } else {
          const plan = state.workoutPlans.find((p) => p.planId === activePlanId);
          if (!plan) return;
          
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
          set((s) => ({
            workoutPlans: s.workoutPlans.map((p) => p.planId === activePlanId ? updatedPlan : p),
          }));
          get().onPlanUpdated?.(updatedPlan);
        }
      },
      
      getTodayAssignment: () => {
        const state = get();
        const plan = state.workoutPlans.find((p) => p.planId === state.activePlanId);
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
      version: 3,
      migrate: (persistedState: any, version: number) => {
        const state = persistedState as any;
        
        if (version < 2 && state) {
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
        
        // Migrate from single workoutPlan to workoutPlans array
        if (version < 3 && state) {
          if (state.workoutPlan && !state.workoutPlans) {
            state.workoutPlans = [{ ...state.workoutPlan, isActive: true }];
            state.activePlanId = state.workoutPlan.planId;
          } else if (!state.workoutPlans) {
            state.workoutPlans = [];
            state.activePlanId = null;
          }
        }
        
        return state as WorkoutState;
      },
      partialize: (state) => ({
        workouts: state.workouts,
        workoutLogs: state.workoutLogs,
        customExercises: state.customExercises,
        customMuscleGroups: state.customMuscleGroups,
        exerciseMuscleOverrides: state.exerciseMuscleOverrides,
        workoutPlans: state.workoutPlans,
        activePlanId: state.activePlanId,
      }),
    }
  )
);
