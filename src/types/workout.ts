export interface Exercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio';
  muscleGroup: string;
  description: string;
  isCustom?: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface Workout {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  createdAt: Date;
}

export interface WorkoutLog {
  id: string;
  workoutId: string;
  workoutName: string;
  completedAt: Date;
  duration: number; // in minutes
  exercises: {
    exerciseId: string;
    exerciseName: string;
    sets: { reps: number; weight: number }[];
  }[];
}
