import { Exercise } from '@/types/workout';

export const exercises: Exercise[] = [
  // Chest
  { id: '1', name: 'Bench Press', category: 'chest', muscleGroup: 'Chest', description: 'Classic compound movement for chest development' },
  { id: '2', name: 'Incline Dumbbell Press', category: 'chest', muscleGroup: 'Upper Chest', description: 'Targets upper chest with inclined angle' },
  { id: '3', name: 'Push-ups', category: 'chest', muscleGroup: 'Chest', description: 'Bodyweight chest exercise' },
  { id: '4', name: 'Cable Flyes', category: 'chest', muscleGroup: 'Chest', description: 'Isolation movement for chest' },
  
  // Back
  { id: '5', name: 'Deadlift', category: 'back', muscleGroup: 'Lower Back', description: 'King of compound movements' },
  { id: '6', name: 'Pull-ups', category: 'back', muscleGroup: 'Lats', description: 'Classic back builder' },
  { id: '7', name: 'Barbell Row', category: 'back', muscleGroup: 'Upper Back', description: 'Horizontal pulling movement' },
  { id: '8', name: 'Lat Pulldown', category: 'back', muscleGroup: 'Lats', description: 'Machine alternative to pull-ups' },
  
  // Shoulders
  { id: '9', name: 'Overhead Press', category: 'shoulders', muscleGroup: 'Shoulders', description: 'Primary shoulder builder' },
  { id: '10', name: 'Lateral Raises', category: 'shoulders', muscleGroup: 'Side Delts', description: 'Isolation for side delts' },
  { id: '11', name: 'Face Pulls', category: 'shoulders', muscleGroup: 'Rear Delts', description: 'Great for posture and rear delts' },
  
  // Arms
  { id: '12', name: 'Barbell Curl', category: 'arms', muscleGroup: 'Biceps', description: 'Classic bicep builder' },
  { id: '13', name: 'Tricep Dips', category: 'arms', muscleGroup: 'Triceps', description: 'Compound tricep movement' },
  { id: '14', name: 'Hammer Curls', category: 'arms', muscleGroup: 'Biceps', description: 'Targets brachialis and biceps' },
  { id: '15', name: 'Skull Crushers', category: 'arms', muscleGroup: 'Triceps', description: 'Isolation tricep exercise' },
  
  // Legs
  { id: '16', name: 'Squat', category: 'legs', muscleGroup: 'Quadriceps', description: 'The king of leg exercises' },
  { id: '17', name: 'Romanian Deadlift', category: 'legs', muscleGroup: 'Hamstrings', description: 'Targets posterior chain' },
  { id: '18', name: 'Leg Press', category: 'legs', muscleGroup: 'Quadriceps', description: 'Machine compound movement' },
  { id: '19', name: 'Calf Raises', category: 'legs', muscleGroup: 'Calves', description: 'Isolation for calves' },
  { id: '20', name: 'Lunges', category: 'legs', muscleGroup: 'Quadriceps', description: 'Unilateral leg exercise' },
  
  // Core
  { id: '21', name: 'Plank', category: 'core', muscleGroup: 'Core', description: 'Isometric core stability' },
  { id: '22', name: 'Hanging Leg Raises', category: 'core', muscleGroup: 'Lower Abs', description: 'Advanced ab exercise' },
  { id: '23', name: 'Cable Crunches', category: 'core', muscleGroup: 'Abs', description: 'Weighted ab isolation' },
  
  // Cardio
  { id: '24', name: 'Running', category: 'cardio', muscleGroup: 'Cardiovascular', description: 'Classic cardio exercise' },
  { id: '25', name: 'Rowing Machine', category: 'cardio', muscleGroup: 'Full Body', description: 'Low impact full body cardio' },
  { id: '26', name: 'Jump Rope', category: 'cardio', muscleGroup: 'Cardiovascular', description: 'High intensity cardio' },
];

export const categoryLabels: Record<Exercise['category'], string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
};
