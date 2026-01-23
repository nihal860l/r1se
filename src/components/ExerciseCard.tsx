import { Exercise } from '@/types/workout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExerciseCardProps {
  exercise: Exercise;
  onClick?: () => void;
  selected?: boolean;
}

export function ExerciseCard({ exercise, onClick, selected }: ExerciseCardProps) {
  return (
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
          <Badge variant="secondary" className="shrink-0 capitalize">
            {exercise.muscleGroup}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
