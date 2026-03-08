import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  IntensityLevel, 
  SetType,
  SET_TYPE_LABELS,
  INTENSITY_LABELS,
  CompletedSet,
  WorkoutExercise,
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
import { ExerciseCard } from '@/components/ExerciseCard';
import { Layout } from '@/components/Layout';
import { PickerDialog } from '@/components/PickerDialog';
import { SetRow } from '@/components/SetRow';
import { GuidedWorkoutView } from '@/components/GuidedWorkoutView';
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
import { InlineCreateExerciseDialog } from '@/components/InlineCreateExerciseDialog';

interface SetLog {
  weight: number;
  reps: number | null;
  intensity: IntensityLevel | null;
  setType: SetType;
  completed: boolean;
}

// Generate reps options 0-100
const REPS_OPTIONS = Array.from({ length: 101 }, (_, i) => i);
const INTENSITY_OPTIONS: IntensityLevel[] = ['warmup', '2rir', '1rir', 'failure'];
const SET_TYPE_OPTIONS: SetType[] = ['normal', 'superset', 'alternating', 'challenge'];

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();
  
  const workouts = useWorkoutStore((state) => state.workouts);
  const addWorkoutLog = useWorkoutStore((state) => state.addWorkoutLog);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { toast } = useToast();

  const workout = workouts.find((w) => w.id === workoutId);
  const allExercises = [...exercises, ...customExercises];

  // Mode: 'guided' or 'classic'
  const [mode, setMode] = useState<'choose' | 'guided' | 'classic'>('choose');

  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLog[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const [repsPicker, setRepsPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [intensityPicker, setIntensityPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [setTypePicker, setSetTypePicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [showCreateExercise, setShowCreateExercise] = useState(false);

  const filteredExercises = useExerciseSearch(allExercises, exerciseSearch);

  // Initialize workout for classic mode
  useEffect(() => {
    if (workout && mode === 'classic') {
      setStartTime(new Date());
      setWorkoutExercises([...workout.exercises]);
      
      const logs: Record<string, SetLog[]> = {};
      workout.exercises.forEach((we) => {
        logs[we.exerciseId] = we.sets.map((set) => ({
          weight: set.weight,
          reps: null,
          intensity: set.intensity || null,
          setType: set.setType || 'normal',
          completed: false,
        }));
      });
      setExerciseLogs(logs);
      setIsEditMode(false);
    }
  }, [workout, mode]);

  // Timer
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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
      sets: [{ weight: 0, setType: 'normal', intensity: '2rir' }],
    };
    
    setWorkoutExercises((prev) => [...prev, newExercise]);
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: [{ weight: 0, reps: null, intensity: '2rir', setType: 'normal', completed: false }],
    }));
    setShowAddExercise(false);
    setExerciseSearch('');
  };

  const handleInlineExerciseCreated = (exerciseId: string) => {
    addExerciseToWorkout(exerciseId);
    setShowCreateExercise(false);
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
    const newIntensity = lastSet?.intensity || '2rir';

    setWorkoutExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: [...e.sets, { weight: newWeight, setType: newSetType, intensity: newIntensity as IntensityLevel }] }
          : e
      )
    );
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: [...prev[exerciseId], { 
        weight: newWeight, 
        reps: null, 
        intensity: newIntensity, 
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
      title: 'Workout complete! 💪',
      description: `${workout.name} logged in ${formatTime(elapsed)}.`,
    });

    navigate('/');
  };

  // Guided mode completion handler
  const handleGuidedComplete = useCallback((
    completedExercises: { exerciseId: string; exerciseName: string; sets: CompletedSet[] }[],
    duration: number
  ) => {
    if (!workout) return;

    addWorkoutLog({
      id: crypto.randomUUID(),
      workoutId: workout.id,
      workoutName: workout.name,
      completedAt: new Date(),
      duration,
      exercises: completedExercises,
    });

    toast({
      title: 'Workout complete! 💪',
      description: `${workout.name} has been saved to your history.`,
    });

    navigate('/');
  }, [workout, addWorkoutLog, toast, navigate]);

  const handleCancel = () => {
    if (mode === 'choose') {
      navigate('/');
      return;
    }
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    navigate('/');
  };

  // Get current picker values
  const currentRepsValue = repsPicker 
    ? exerciseLogs[repsPicker.exerciseId]?.[repsPicker.setIndex]?.reps ?? 0
    : 0;
    
  const currentIntensityValue = intensityPicker
    ? exerciseLogs[intensityPicker.exerciseId]?.[intensityPicker.setIndex]?.intensity ?? 'warmup'
    : 'warmup';

  const currentSetTypeValue = setTypePicker
    ? exerciseLogs[setTypePicker.exerciseId]?.[setTypePicker.setIndex]?.setType ?? 'normal'
    : 'normal';

  if (!workout) {
    return (
      <Layout hideNav>
        <div className="container max-w-lg px-4 py-8 text-center">
          <p className="text-muted-foreground">Workout not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  // ===== MODE CHOOSER =====
  if (mode === 'choose') {
    return (
      <Layout hideNav>
        <div className="container max-w-lg animate-fade-in px-4 flex flex-col items-center justify-center min-h-[calc(100vh-60px)] gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">{workout.name}</h2>
            <p className="text-muted-foreground mt-1">How do you want to train?</p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <Button
              onClick={() => setMode('guided')}
              className="w-full h-14 text-base"
            >
              🎯 Guided Mode
            </Button>
            <p className="text-xs text-muted-foreground text-center px-4">
              Step-by-step through each set with rest timers
            </p>

            <Button
              variant="outline"
              onClick={() => setMode('classic')}
              className="w-full h-14 text-base text-foreground"
            >
              📋 Classic Mode
            </Button>
            <p className="text-xs text-muted-foreground text-center px-4">
              See all exercises at once, log freely
            </p>
          </div>

          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground mt-4">
            Cancel
          </Button>
        </div>
      </Layout>
    );
  }

  // ===== GUIDED MODE =====
  if (mode === 'guided') {
    return (
      <Layout hideNav>
        <div className="container max-w-lg animate-fade-in px-4 flex flex-col min-h-[calc(100vh-60px)]">
          <GuidedWorkoutView
            workoutName={workout.name}
            workoutExercises={workout.exercises}
            allExercises={allExercises}
            onComplete={handleGuidedComplete}
            onCancel={handleCancel}
          />
        </div>
      </Layout>
    );
  }

  // ===== CLASSIC MODE =====
  return (
    <Layout hideNav>
      <div className="container max-w-lg animate-fade-in px-4 flex flex-col min-h-[calc(100vh-60px)]">
        {/* Header */}
        <div className="pt-4 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{workout.name}</h2>
              <p className="text-sm text-muted-foreground">Active workout session</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-primary">{formatTime(elapsed)}</span>
              <Button
                variant={isEditMode ? 'default' : 'outline'}
                size="sm"
                className="text-foreground"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Pencil className="w-4 h-4 mr-1" />
                {isEditMode ? 'Done' : 'Edit'}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="text-foreground">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          {isEditMode && (
            <p className="text-sm text-muted-foreground mt-2">
              Edit mode: Add/remove exercises and sets, modify weights
            </p>
          )}
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 py-4">
            {workoutExercises.map((we) => {
              const exercise = allExercises.find((e) => e.id === we.exerciseId);
              if (!exercise) return null;
              const sets = exerciseLogs[we.exerciseId] || [];

              return (
                <div key={we.exerciseId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{exercise.name}</h3>
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
                    <div className="grid grid-cols-[48px_1fr_56px_64px_40px] gap-1 text-xs text-muted-foreground px-1">
                      <span className="text-center text-muted-foreground">Set</span>
                      <span className="text-muted-foreground">Weight</span>
                      <span className="text-center text-muted-foreground">Reps</span>
                      <span className="text-center text-muted-foreground">Intensity</span>
                      <span></span>
                    </div>
                    
                    {sets.map((set, i) => (
                      <SetRow
                        key={i}
                        index={i}
                        weight={set.weight}
                        reps={set.reps}
                        intensity={set.intensity}
                        setType={set.setType || 'normal'}
                        completed={set.completed}
                        isEditMode={isEditMode}
                        isOnlySet={sets.length === 1}
                        onWeightChange={(weight) => updateSetLog(we.exerciseId, i, 'weight', weight)}
                        onOpenRepsPicker={() => setRepsPicker({ exerciseId: we.exerciseId, setIndex: i })}
                        onOpenIntensityPicker={() => setIntensityPicker({ exerciseId: we.exerciseId, setIndex: i })}
                        onOpenSetTypePicker={() => setSetTypePicker({ exerciseId: we.exerciseId, setIndex: i })}
                        onToggleComplete={() => toggleSetComplete(we.exerciseId, i)}
                        onRemoveSet={() => removeSetFromExercise(we.exerciseId, i)}
                      />
                    ))}
                    
                    {isEditMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-foreground/20 text-foreground"
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
                className="w-full text-foreground"
                onClick={() => setShowAddExercise(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="py-4 border-t">
          <Button onClick={finishWorkout} className="w-full h-12 text-base">
            Finish Workout
          </Button>
        </div>
      </div>

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

      {/* Set Type Picker Dialog */}
      <PickerDialog
        open={setTypePicker !== null}
        onOpenChange={(open) => !open && setSetTypePicker(null)}
        title="Select Set Type"
        items={SET_TYPE_OPTIONS}
        value={currentSetTypeValue}
        onConfirm={(value) => {
          if (setTypePicker) {
            updateSetLog(setTypePicker.exerciseId, setTypePicker.setIndex, 'setType', value);
          }
        }}
        getLabel={(item) => SET_TYPE_LABELS[item]}
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
              
              <Button
                variant="outline"
                className="w-full mt-2 text-foreground"
                onClick={() => {
                  setShowAddExercise(false);
                  setShowCreateExercise(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Exercise
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Create Exercise Dialog */}
      <InlineCreateExerciseDialog
        open={showCreateExercise}
        onOpenChange={setShowCreateExercise}
        onExerciseCreated={handleInlineExerciseCreated}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will not be saved. Are you sure you want to cancel this workout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Workout</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Workout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
