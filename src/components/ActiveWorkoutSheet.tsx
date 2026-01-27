import { useState, useEffect } from 'react';
import { Check, X, Plus, Minus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Workout, WorkoutExercise, WorkoutSet } from '@/types/workout';
import { exercises } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExerciseCard } from './ExerciseCard';

interface ActiveWorkoutSheetProps {
  workout: Workout | null;
  open: boolean;
  onClose: () => void;
}

interface SetLog {
  weight: number;
  reps: string; // String to handle empty state
  completed: boolean;
}

export function ActiveWorkoutSheet({ workout, open, onClose }: ActiveWorkoutSheetProps) {
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLog[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  
  const addWorkoutLog = useWorkoutStore((state) => state.addWorkoutLog);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { toast } = useToast();

  const allExercises = [...exercises, ...customExercises];

  const filteredExercises = allExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    exercise.muscleGroup.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  useEffect(() => {
    if (open && workout) {
      setStartTime(new Date());
      setWorkoutExercises([...workout.exercises]);
      
      // Initialize logs with pre-filled weights and empty reps
      const logs: Record<string, SetLog[]> = {};
      workout.exercises.forEach((we) => {
        logs[we.exerciseId] = we.sets.map((set) => ({
          weight: set.weight,
          reps: '', // Empty - to be filled during workout
          completed: false,
        }));
      });
      setExerciseLogs(logs);
      setIsEditMode(false);
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

  const updateSetLog = (exerciseId: string, setIndex: number, field: keyof SetLog, value: number | string | boolean) => {
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((set, i) =>
        i === setIndex ? { ...set, [field]: value } : set
      ),
    }));
  };

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    const currentSet = exerciseLogs[exerciseId][setIndex];
    updateSetLog(exerciseId, setIndex, 'completed', !currentSet.completed);
  };

  // Edit mode functions
  const addExerciseToWorkout = (exerciseId: string) => {
    if (workoutExercises.some((e) => e.exerciseId === exerciseId)) {
      setShowAddExercise(false);
      return;
    }

    const newExercise: WorkoutExercise = {
      exerciseId,
      sets: [{ weight: 0 }],
    };
    
    setWorkoutExercises((prev) => [...prev, newExercise]);
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: [{ weight: 0, reps: '', completed: false }],
    }));
    setShowAddExercise(false);
    setExerciseSearch('');
  };

  const removeExercise = (exerciseId: string) => {
    setWorkoutExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
    setExerciseLogs((prev) => {
      const newLogs = { ...prev };
      delete newLogs[exerciseId];
      return newLogs;
    });
  };

  const addSetToExercise = (exerciseId: string) => {
    const lastSet = exerciseLogs[exerciseId]?.[exerciseLogs[exerciseId].length - 1];
    const newWeight = lastSet?.weight || 0;

    setWorkoutExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: [...e.sets, { weight: newWeight }] }
          : e
      )
    );
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: [...prev[exerciseId], { weight: newWeight, reps: '', completed: false }],
    }));
  };

  const removeSetFromExercise = (exerciseId: string, setIndex: number) => {
    setWorkoutExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
          : e
      ).filter((e) => e.sets.length > 0)
    );
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].filter((_, i) => i !== setIndex),
    }));
  };

  const finishWorkout = () => {
    if (!workout || !startTime) return;

    const completedExercises = Object.entries(exerciseLogs)
      .filter(([, sets]) => sets.some((s) => s.completed))
      .map(([exerciseId, sets]) => {
        const exercise = allExercises.find((e) => e.id === exerciseId);
        return {
          exerciseId,
          exerciseName: exercise?.name || 'Unknown',
          sets: sets
            .filter((s) => s.completed)
            .map(({ reps, weight }) => ({
              reps: parseInt(reps) || 0,
              weight,
            })),
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
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle>{workout.name}</SheetTitle>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono text-primary">{formatTime(elapsed)}</span>
                <Button
                  variant={isEditMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  {isEditMode ? 'Done' : 'Edit'}
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {isEditMode && (
              <p className="text-sm text-muted-foreground mt-2">
                Edit mode: Add/remove exercises and sets, modify weights
              </p>
            )}
          </SheetHeader>

           <div className="flex-1 overflow-y-auto -mx-6 px-6">
             <div className="space-y-6 py-4">
              {workoutExercises.map((we) => {
                const exercise = allExercises.find((e) => e.id === we.exerciseId);
                if (!exercise) return null;
                const sets = exerciseLogs[we.exerciseId] || [];

                return (
                  <div key={we.exerciseId} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{exercise.name}</h3>
                      {isEditMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeExercise(we.exerciseId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
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
                              onClick={() => updateSetLog(we.exerciseId, i, 'weight', Math.max(0, set.weight - 2.5))}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={set.weight}
                              onChange={(e) => updateSetLog(we.exerciseId, i, 'weight', Number(e.target.value))}
                              className="h-8 text-center"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateSetLog(we.exerciseId, i, 'weight', set.weight + 2.5)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                const currentReps = parseInt(set.reps) || 0;
                                updateSetLog(we.exerciseId, i, 'reps', Math.max(0, currentReps - 1).toString());
                              }}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={set.reps}
                              placeholder="—"
                              onChange={(e) => updateSetLog(we.exerciseId, i, 'reps', e.target.value)}
                              className="h-8 text-center"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                const currentReps = parseInt(set.reps) || 0;
                                updateSetLog(we.exerciseId, i, 'reps', (currentReps + 1).toString());
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            {isEditMode && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSetFromExercise(we.exerciseId, i)}
                                disabled={sets.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant={set.completed ? 'default' : 'outline'}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleSetComplete(we.exerciseId, i)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {isEditMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => addSetToExercise(we.exerciseId)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Set
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {isEditMode && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddExercise(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise
                </Button>
              )}
            </div>
           </div>

          <div className="pt-4 border-t">
            <Button onClick={finishWorkout} className="w-full" size="lg">
              Finish Workout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Exercise Dialog */}
      <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
        <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex-1 h-[300px] overflow-y-auto -mx-6 px-6">
            <div className="space-y-2 pb-4">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  selected={workoutExercises.some((e) => e.exerciseId === exercise.id)}
                  onClick={() => addExerciseToWorkout(exercise.id)}
                  showEdit={false}
                />
              ))}
              {filteredExercises.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No exercises found
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
