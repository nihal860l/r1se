import { useState } from 'react';
import { Exercise } from '@/types/workout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/store/workoutStore';
import { EditExerciseDialog } from '@/components/EditExerciseDialog';
import { Pencil } from 'lucide-react';

interface ExerciseCardProps {
  exercise: Exercise;
  onClick?: () => void;
  selected?: boolean;
  showEdit?: boolean;
}

export function ExerciseCard({ exercise, onClick, selected, showEdit = true }: ExerciseCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const exerciseMuscleOverrides = useWorkoutStore((state) => state.exerciseMuscleOverrides);
  
  const displayMuscleGroup = exerciseMuscleOverrides[exercise.id] || exercise.muscleGroup;

  return (
    <>
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          selected 
            ? 'ring-2 ring-primary bg-primary/5' 
            : 'hover:bg-secondary/50'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{exercise.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {exercise.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="capitalize">
                {displayMuscleGroup}
              </Badge>
              {showEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <EditExerciseDialog
        exercise={exercise}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
