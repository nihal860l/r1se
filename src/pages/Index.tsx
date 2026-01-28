import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { WorkoutCard } from '@/components/WorkoutCard';
import { CreateWorkoutDialog } from '@/components/CreateWorkoutDialog';
import { ActiveWorkoutSheet } from '@/components/ActiveWorkoutSheet';
import { useWorkoutStore } from '@/store/workoutStore';
import { Workout } from '@/types/workout';
import { Dumbbell } from 'lucide-react';

const Index = () => {
  const workouts = useWorkoutStore((state) => state.workouts);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-4 pb-4">
          <h2 className="text-xl font-semibold">Workouts</h2>
          <p className="text-sm text-muted-foreground">Your custom training programs</p>
        </div>

        <div className="space-y-4">
          <CreateWorkoutDialog />

          {workouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Dumbbell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-1">No workouts yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Create your first workout to start tracking your training sessions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onStart={setActiveWorkout}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ActiveWorkoutSheet
        workout={activeWorkout}
        open={!!activeWorkout}
        onClose={() => setActiveWorkout(null)}
      />
    </Layout>
  );
};

export default Index;
