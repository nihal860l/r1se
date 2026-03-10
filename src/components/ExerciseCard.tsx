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

  const overriddenMuscle = exerciseMuscleOverrides[exercise.id];
  const displayMuscles = overriddenMuscle ? [overriddenMuscle] : exercise.muscles;

  return (
    <>
      <Card
        className={`cursor-pointer transition-all duration-200 ${
          selected
            ? 'ring-2 ring-primary bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.25)] border-primary/40'
            : 'hover:bg-secondary/50'
        }`}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm leading-tight">{exercise.name}</h3>
            </div>
            <div className="flex items-start gap-1.5 shrink-0">
              <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                {displayMuscles.map((muscle, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0.5 leading-tight whitespace-nowrap"
                  >
                    {muscle}
                  </Badge>
                ))}
              </div>
              {showEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
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
