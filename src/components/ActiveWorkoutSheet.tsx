import { useState, useEffect } from 'react';
import { Check, X, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Workout } from '@/types/workout';
import { exercises } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { useToast } from '@/hooks/use-toast';

interface ActiveWorkoutSheetProps {
  workout: Workout | null;
  open: boolean;
  onClose: () => void;
}

interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
}

export function ActiveWorkoutSheet({ workout, open, onClose }: ActiveWorkoutSheetProps) {
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLog[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  
  const addWorkoutLog = useWorkoutStore((state) => state.addWorkoutLog);
  const { toast } = useToast();

  useEffect(() => {
    if (open && workout) {
      setStartTime(new Date());
      // Initialize logs
      const logs: Record<string, SetLog[]> = {};
      workout.exercises.forEach((we) => {
        logs[we.exerciseId] = Array(we.sets).fill(null).map(() => ({
          reps: we.reps,
          weight: 0,
          completed: false,
        }));
      });
      setExerciseLogs(logs);
    }
  }, [open, workout]);

  useEffect(() => {
    if (!open || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [open, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSet = (exerciseId: string, setIndex: number, field: keyof SetLog, value: number | boolean) => {
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((set, i) =>
        i === setIndex ? { ...set, [field]: value } : set
      ),
    }));
  };

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    updateSet(exerciseId, setIndex, 'completed', !exerciseLogs[exerciseId][setIndex].completed);
  };

  const finishWorkout = () => {
    if (!workout || !startTime) return;

    const completedExercises = Object.entries(exerciseLogs)
      .filter(([, sets]) => sets.some((s) => s.completed))
      .map(([exerciseId, sets]) => {
        const exercise = exercises.find((e) => e.id === exerciseId);
        return {
          exerciseId,
          exerciseName: exercise?.name || 'Unknown',
          sets: sets.filter((s) => s.completed).map(({ reps, weight }) => ({ reps, weight })),
        };
      });

    addWorkoutLog({
      id: crypto.randomUUID(),
      workoutId: workout.id,
      workoutName: workout.name,
      completedAt: new Date(),
      duration: Math.floor(elapsed / 60),
      exercises: completedExercises,
    });

    toast({
      title: 'Workout complete! 💪',
      description: `${workout.name} logged in ${formatTime(elapsed)}.`,
    });

    onClose();
  };

  if (!workout) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>{workout.name}</SheetTitle>
            <div className="flex items-center gap-3">
              <span className="text-lg font-mono text-primary">{formatTime(elapsed)}</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {workout.exercises.map((we) => {
              const exercise = exercises.find((e) => e.id === we.exerciseId);
              if (!exercise) return null;
              const sets = exerciseLogs[we.exerciseId] || [];

              return (
                <div key={we.exerciseId} className="space-y-3">
                  <h3 className="font-semibold">{exercise.name}</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-2">
                      <span>Set</span>
                      <span>Weight (kg)</span>
                      <span>Reps</span>
                      <span></span>
                    </div>
                    {sets.map((set, i) => (
                      <div
                        key={i}
                        className={`grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center p-2 rounded-lg transition-colors ${
                          set.completed ? 'bg-primary/10' : 'bg-secondary/50'
                        }`}
                      >
                        <span className="w-6 text-center text-sm font-medium">{i + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateSet(we.exerciseId, i, 'weight', Math.max(0, set.weight - 2.5))}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={set.weight}
                            onChange={(e) => updateSet(we.exerciseId, i, 'weight', Number(e.target.value))}
                            className="h-8 text-center"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateSet(we.exerciseId, i, 'weight', set.weight + 2.5)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateSet(we.exerciseId, i, 'reps', Math.max(1, set.reps - 1))}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={set.reps}
                            onChange={(e) => updateSet(we.exerciseId, i, 'reps', Number(e.target.value))}
                            className="h-8 text-center"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateSet(we.exerciseId, i, 'reps', set.reps + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          variant={set.completed ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleSetComplete(we.exerciseId, i)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t">
          <Button onClick={finishWorkout} className="w-full" size="lg">
            Finish Workout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
