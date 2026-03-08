import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workout } from '@/types/workout';
import { exercises } from '@/data/exercises';
import { Pencil, Trash2, Copy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkoutStore } from '@/store/workoutStore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WorkoutTemplateCardProps {
  workout: Workout;
  onSelect?: () => void;
  showSelectButton?: boolean;
}

export function WorkoutTemplateCard({ workout, onSelect, showSelectButton = false }: WorkoutTemplateCardProps) {
  const navigate = useNavigate();
  const deleteWorkout = useWorkoutStore((state) => state.deleteWorkout);
  const addWorkout = useWorkoutStore((state) => state.addWorkout);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const allExercises = [...exercises, ...customExercises];

  const exerciseNames = workout.exercises
    .map((we) => allExercises.find((e) => e.id === we.exerciseId)?.name)
    .filter(Boolean)
    .slice(0, 3);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/create-workout?edit=${workout.id}`);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicatedWorkout: Workout = {
      ...workout,
      id: crypto.randomUUID(),
      name: `${workout.name} (Copy)`,
      createdAt: new Date(),
    };
    addWorkout(duplicatedWorkout);
    toast({
      title: 'Workout duplicated',
      description: `Created "${duplicatedWorkout.name}"`,
    });
  };

  const handleDelete = () => {
    deleteWorkout(workout.id);
    setShowDeleteConfirm(false);
    toast({
      title: 'Workout deleted',
      description: `${workout.name} has been removed.`,
    });
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/workout/${workout.id}`);
  };

  const handleCardClick = () => {
    if (showSelectButton && onSelect) {
      onSelect();
    }
  };

  return (
    <>
      <Card 
        className={`card-hover bg-card border-border ${showSelectButton ? 'cursor-pointer' : ''}`}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold">{workout.name}</CardTitle>
            {!showSelectButton && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleEdit}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleDuplicate}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            {exerciseNames.join(' • ')}
            {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
          </p>
          <span className="text-xs text-muted-foreground">
            {workout.exercises.length} exercises
          </span>
          
          {showSelectButton ? (
            <Button 
              size="sm" 
              className="w-full mt-4"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
            >
              Select
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full mt-4 gap-2"
              onClick={handleStart}
            >
              <Play className="w-4 h-4" />
              Start Workout
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The workout template will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
