import { useState, useEffect } from 'react';
import { Check, X, Plus, Minus, Pencil, Trash2, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { 
  Workout, 
  WorkoutExercise, 
  IntensityLevel, 
  SetType,
  SET_TYPE_LABELS,
  INTENSITY_LABELS,
  CompletedSet,
} from '@/types/workout';
import { exercises } from '@/data/exercises';
import { useExerciseSearch } from '@/lib/exerciseSearch';
import { useWorkoutStore } from '@/store/workoutStore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExerciseCard } from './ExerciseCard';
import { useHeaderContext } from './Layout';
import { PickerDialog } from './PickerDialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ActiveWorkoutSheetProps {
  workout: Workout | null;
  open: boolean;
  onClose: () => void;
}

interface SetLog {
  weight: number;
  reps: number | null;
  intensity: IntensityLevel | null;
  setType: SetType;
  completed: boolean;
}

// Generate reps options 0-100 (no looping, hard cap at 100)
const REPS_OPTIONS = Array.from({ length: 101 }, (_, i) => i);

// Intensity options
const INTENSITY_OPTIONS: IntensityLevel[] = ['warmup', '2rir', '1rir', 'failure'];

// Set type options
const SET_TYPE_OPTIONS: SetType[] = ['normal', 'superset', 'alternating'];

export function ActiveWorkoutSheet({ workout, open, onClose }: ActiveWorkoutSheetProps) {
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLog[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  
  // Picker state
  const [repsPicker, setRepsPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [intensityPicker, setIntensityPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  
  const addWorkoutLog = useWorkoutStore((state) => state.addWorkoutLog);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { toast } = useToast();
  const { setIsOverlayOpen } = useHeaderContext();

  useEffect(() => {
    setIsOverlayOpen(open);
  }, [open, setIsOverlayOpen]);

  const allExercises = [...exercises, ...customExercises];

  const filteredExercises = useExerciseSearch(allExercises, exerciseSearch);

  useEffect(() => {
    if (open && workout) {
      setStartTime(new Date());
      setWorkoutExercises([...workout.exercises]);
      
      const logs: Record<string, SetLog[]> = {};
      workout.exercises.forEach((we) => {
        logs[we.exerciseId] = we.sets.map((set) => ({
          weight: set.weight,
          reps: null,
          intensity: set.intensity || null, // Load planned intensity
          setType: set.setType || 'normal',
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

  const updateSetLog = (
    exerciseId: string, 
    setIndex: number, 
    field: keyof SetLog, 
    value: number | string | boolean | null
  ) => {
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
      [exerciseId]: [{ weight: 0, reps: null, intensity: null, setType: 'normal', completed: false }],
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
    const newSetType = lastSet?.setType || 'normal';

    setWorkoutExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: [...e.sets, { weight: newWeight, setType: newSetType }] }
          : e
      )
    );
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: [...prev[exerciseId], { 
        weight: newWeight, 
        reps: null, 
        intensity: null, 
        setType: newSetType, 
        completed: false 
      }],
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
            .map(({ reps, weight, intensity, setType }): CompletedSet => ({
              reps: reps || 0,
              weight,
              intensity: intensity || undefined,
              setType: setType || undefined,
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
      title: 'Workout complete',
      description: `${workout.name} logged in ${formatTime(elapsed)}.`,
    });

    onClose();
  };

  // Get current picker values
  const currentRepsValue = repsPicker 
    ? exerciseLogs[repsPicker.exerciseId]?.[repsPicker.setIndex]?.reps ?? 0
    : 0;
    
  const currentIntensityValue = intensityPicker
    ? exerciseLogs[intensityPicker.exerciseId]?.[intensityPicker.setIndex]?.intensity ?? 'warmup'
    : 'warmup';

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
                      {/* Header row */}
                      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-1 text-xs text-muted-foreground px-1">
                        <span className="w-12 text-center">Set</span>
                        <span>Weight</span>
                        <span className="w-14 text-center">Reps</span>
                        <span className="w-16 text-center">Intensity</span>
                        <span className="w-8"></span>
                      </div>
                      
                      {sets.map((set, i) => (
                        <div
                          key={i}
                          className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-1 items-center p-2 rounded-lg transition-colors ${
                            set.completed ? 'bg-primary/10' : 'bg-secondary/50'
                          }`}
                        >
                          {/* Set number with type picker */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-12 h-8 px-1 text-xs font-medium"
                              >
                                {set.setType === 'normal' ? (
                                  <span>{i + 1}</span>
                                ) : (
                                  <span className="truncate text-primary">
                                    {SET_TYPE_LABELS[set.setType].split(' ')[0]}
                                  </span>
                                )}
                                <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1 bg-popover border border-border" align="start">
                              {SET_TYPE_OPTIONS.map((type) => (
                                <Button
                                  key={type}
                                  variant={set.setType === type ? 'secondary' : 'ghost'}
                                  size="sm"
                                  className="w-full justify-start text-sm"
                                  onClick={() => updateSetLog(we.exerciseId, i, 'setType', type)}
                                >
                                  {SET_TYPE_LABELS[type]}
                                </Button>
                              ))}
                            </PopoverContent>
                          </Popover>
                          
                          {/* Weight */}
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => updateSetLog(we.exerciseId, i, 'weight', Math.max(0, set.weight - 2.5))}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={set.weight}
                              onChange={(e) => updateSetLog(we.exerciseId, i, 'weight', Number(e.target.value))}
                              className="h-8 text-center min-w-0"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => updateSetLog(we.exerciseId, i, 'weight', set.weight + 2.5)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Reps - tap to open picker */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-14 h-8 text-sm"
                            onClick={() => setRepsPicker({ exerciseId: we.exerciseId, setIndex: i })}
                          >
                            {set.reps !== null ? set.reps : '—'}
                          </Button>
                          
                          {/* Intensity - tap to open picker */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-16 h-8 text-xs px-1"
                            onClick={() => setIntensityPicker({ exerciseId: we.exerciseId, setIndex: i })}
                          >
                            {set.intensity ? INTENSITY_LABELS[set.intensity].split(' ')[0] : '—'}
                          </Button>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-0.5">
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

      {/* Reps Picker Dialog */}
      <PickerDialog
        open={repsPicker !== null}
        onOpenChange={(open) => !open && setRepsPicker(null)}
        title="Select Reps"
        items={REPS_OPTIONS}
        value={currentRepsValue}
        onConfirm={(value) => {
          if (repsPicker) {
            updateSetLog(repsPicker.exerciseId, repsPicker.setIndex, 'reps', value);
          }
        }}
      />

      {/* Intensity Picker Dialog */}
      <PickerDialog
        open={intensityPicker !== null}
        onOpenChange={(open) => !open && setIntensityPicker(null)}
        title="Select Intensity"
        items={INTENSITY_OPTIONS}
        value={currentIntensityValue}
        onConfirm={(value) => {
          if (intensityPicker) {
            updateSetLog(intensityPicker.exerciseId, intensityPicker.setIndex, 'intensity', value);
          }
        }}
        getLabel={(item) => INTENSITY_LABELS[item]}
      />

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
