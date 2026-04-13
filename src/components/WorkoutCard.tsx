import { Workout } from '@/types/workout';
import { exercises } from '@/data/exercises';
import { Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkoutStore } from '@/store/workoutStore';
import { useGlowStore } from '@/store/glowStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WorkoutCardProps {
  workout: Workout;
  onStart: () => void;
}

export function WorkoutCard({ workout, onStart }: WorkoutCardProps) {
  const deleteWorkout = useWorkoutStore((state) => state.deleteWorkout);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const { toast } = useToast();

  const allExercises = [...exercises, ...customExercises];

  const exerciseNames = workout.exercises
    .map((we) => allExercises.find((e) => e.id === we.exerciseId)?.name)
    .filter(Boolean)
    .slice(0, 3);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteWorkout(workout.id);
    toast({
      title: 'Workout deleted',
      description: `${workout.name} has been removed.`,
    });
  };

  return (
    <Card className={cn(
      "bg-card transition-all duration-300 hover:border-primary/25 hover:-translate-y-0.5",
      glowEnabled && "card-glow border-glow hover:shadow-[0_0_25px_hsl(189_100%_51%/0.1)]"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-bold">{workout.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {exerciseNames.join(' · ')}
          {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {workout.exercises.length} exercises
          </span>
          <Button
            size="sm"
            onClick={onStart}
            glow={glowEnabled}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Start
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
