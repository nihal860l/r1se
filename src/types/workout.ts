export interface Exercise {
  id: string;
  name: string;
  muscles: string[];
  keywords: string[];
  isDefault: boolean;
  category: string;
  muscleGroup: string;
  description: string;
  isCustom?: boolean;
}

export type SetType = 'normal' | 'superset' | 'alternating' | 'challenge';

export type IntensityLevel = 'warmup' | '2rir' | '1rir' | 'failure';

export interface WorkoutSet {
  weight: number;
  reps?: number;
  setType?: SetType;
  intensity?: IntensityLevel;
  targetReps?: number; // For challenge sets: total reps to accumulate
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
  notes?: string; // Coach note attached to this exercise
}

export interface Workout {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  createdAt: Date;
}

export interface CompletedSet {
  reps: number;
  weight: number;
  intensity?: IntensityLevel;
  setType?: SetType;
  targetReps?: number;
}

export interface WorkoutLog {
  id: string;
  workoutId: string;
  workoutName: string;
  completedAt: Date;
  duration: number;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    sets: CompletedSet[];
  }[];
}

export const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'Normal',
  superset: 'Super Set',
  alternating: 'Alt Super Set',
  challenge: 'Challenge Set',
};

export const SET_TYPE_SHORT_LABELS: Record<SetType, string> = {
  normal: 'Normal',
  superset: 'S',
  alternating: 'A',
  challenge: 'C',
};

export const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  warmup: 'Warm-up',
  '2rir': '2 RIR',
  '1rir': '1 RIR',
  failure: 'Failure',
};

// Workout Plan Types
export type DayAssignmentType = 'Workout' | 'Rest' | 'Empty';

export interface DayAssignment {
  type: DayAssignmentType;
  workoutId: string | null;
}

export interface PlanException {
  date: string; // YYYY-MM-DD
  type: DayAssignmentType;
  workoutId: string | null;
}

export interface WeeklyAssignments {
  '0': DayAssignment; // Sunday
  '1': DayAssignment; // Monday
  '2': DayAssignment; // Tuesday
  '3': DayAssignment; // Wednesday
  '4': DayAssignment; // Thursday
  '5': DayAssignment; // Friday
  '6': DayAssignment; // Saturday
}

export interface WorkoutPlan {
  id: string;
  planId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  weeklyAssignments: WeeklyAssignments;
  exceptions: PlanException[];
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
}

export const DEFAULT_WEEKLY_ASSIGNMENTS: WeeklyAssignments = {
  '0': { type: 'Empty', workoutId: null },
  '1': { type: 'Empty', workoutId: null },
  '2': { type: 'Empty', workoutId: null },
  '3': { type: 'Empty', workoutId: null },
  '4': { type: 'Empty', workoutId: null },
  '5': { type: 'Empty', workoutId: null },
  '6': { type: 'Empty', workoutId: null },
};
