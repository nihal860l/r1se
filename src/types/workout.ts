export interface Exercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio';
  muscleGroup: string;
  description: string;
  isCustom?: boolean;
}

export type SetType = 'normal' | 'superset' | 'alternating';

export type IntensityLevel = 'warmup' | '2rir' | '1rir' | 'failure';

export interface WorkoutSet {
  weight: number;
  reps?: number;
  setType?: SetType;
  intensity?: IntensityLevel;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
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
};

export const SET_TYPE_SHORT_LABELS: Record<SetType, string> = {
  normal: 'Normal',
  superset: 'Super',
  alternating: 'Alt SS',
};

export const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  warmup: 'Warm-up',
  '2rir': '2 RIR',
  '1rir': '1 RIR',
  failure: 'Failure',
};
