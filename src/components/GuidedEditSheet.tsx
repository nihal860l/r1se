import { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { PickerDialog } from './PickerDialog';
import { ExerciseMultiSelectSheet } from './ExerciseMultiSelectSheet';
import {
  WorkoutExercise,
  CompletedSet,
  Exercise,
  INTENSITY_LABELS,
  IntensityLevel,
} from '@/types/workout';

interface GuidedEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutExercises: WorkoutExercise[];
  completedSets: Record<string, CompletedSet[]>;
  allExercises: Exercise[];
  onSave: (exercises: WorkoutExercise[], completedSets: Record<string, CompletedSet[]>) => void;
}

const REPS_OPTIONS = Array.from({ length: 201 }, (_, i) => i);
const INTENSITY_OPTIONS: IntensityLevel[] = ['warmup', '2rir', '1rir', 'failure'];

export function GuidedEditSheet({
  open,
  onOpenChange,
  workoutExercises,
  completedSets,
  allExercises,
  onSave,
}: GuidedEditSheetProps) {
  const [editExercises, setEditExercises] = useState<WorkoutExercise[]>([]);
  const [editCompleted, setEditCompleted] = useState<Record<string, CompletedSet[]>>({});
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [repsPicker, setRepsPicker] = useState<{ exerciseId: string; completedIndex: number } | null>(null);
  const [repsPickerValue, setRepsPickerValue] = useState(0);
  const [intensityPicker, setIntensityPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [intensityPickerValue, setIntensityPickerValue] = useState<IntensityLevel>('warmup');
  const [confirmRemoveExercise, setConfirmRemoveExercise] = useState<string | null>(null);

  // Initialize when sheet opens
  useEffect(() => {
    if (open) {
      setEditExercises(workoutExercises.map(we => ({ ...we, sets: [...we.sets.map(s => ({ ...s }))] })));
      setEditCompleted(
        Object.fromEntries(
          Object.entries(completedSets).map(([k, v]) => [k, v.map(s => ({ ...s }))])
        )
      );
    }
  }, [open, workoutExercises, completedSets]);

  const handleDone = () => {
    // Clean up: remove completed sets for exercises that were removed
    const exerciseIds = new Set(editExercises.map(e => e.exerciseId));
    const cleanedCompleted: Record<string, CompletedSet[]> = {};
    Object.entries(editCompleted).forEach(([id, sets]) => {
      if (exerciseIds.has(id)) {
        cleanedCompleted[id] = sets;
      }
    });
    onSave(editExercises, cleanedCompleted);
    onOpenChange(false);
  };

  const updateSetWeight = (exerciseId: string, setIndex: number, weight: number) => {
    setEditExercises(prev => prev.map(we =>
      we.exerciseId === exerciseId
        ? { ...we, sets: we.sets.map((s, i) => i === setIndex ? { ...s, weight: Math.max(0, weight) } : s) }
        : we
    ));
  };

  const updateSetIntensity = (exerciseId: string, setIndex: number, intensity: IntensityLevel) => {
    setEditExercises(prev => prev.map(we =>
      we.exerciseId === exerciseId
        ? { ...we, sets: we.sets.map((s, i) => i === setIndex ? { ...s, intensity } : s) }
        : we
    ));
  };

  const addSetToExercise = (exerciseId: string) => {
    setEditExercises(prev => prev.map(we => {
      if (we.exerciseId !== exerciseId) return we;
      const lastSet = we.sets[we.sets.length - 1];
      return {
        ...we,
        sets: [...we.sets, { weight: lastSet?.weight || 0, setType: lastSet?.setType || 'normal', intensity: lastSet?.intensity || ('2rir' as IntensityLevel) }],
      };
    }));
  };

  const removeSetFromExercise = (exerciseId: string, setIndex: number) => {
    setEditExercises(prev =>
      prev.map(we =>
        we.exerciseId === exerciseId
          ? { ...we, sets: we.sets.filter((_, i) => i !== setIndex) }
          : we
      ).filter(we => we.sets.length > 0)
    );
  };

  const handleRemoveExercise = (exerciseId: string) => {
    const hasCompleted = (editCompleted[exerciseId]?.length || 0) > 0;
    if (hasCompleted) {
      setConfirmRemoveExercise(exerciseId);
    } else {
      doRemoveExercise(exerciseId);
    }
  };

  const doRemoveExercise = (exerciseId: string) => {
    setEditExercises(prev => prev.filter(we => we.exerciseId !== exerciseId));
    setEditCompleted(prev => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setConfirmRemoveExercise(null);
  };

  const handleAddExercises = (exerciseIds: string[]) => {
    const newExercises = exerciseIds.map(id => ({
      exerciseId: id,
      sets: [{ weight: 0, setType: 'normal' as const, intensity: '2rir' as IntensityLevel }],
    }));
    setEditExercises(prev => [...prev, ...newExercises]);
    setShowAddExercise(false);
  };

  const openCompletedRepsPicker = (exerciseId: string, completedIndex: number) => {
    const val = editCompleted[exerciseId]?.[completedIndex]?.reps ?? 0;
    setRepsPickerValue(val);
    setRepsPicker({ exerciseId, completedIndex });
  };

  const openIntensityPicker = (exerciseId: string, setIndex: number) => {
    const exercise = editExercises.find(e => e.exerciseId === exerciseId);
    const val = exercise?.sets[setIndex]?.intensity || 'warmup';
    setIntensityPickerValue(val as IntensityLevel);
    setIntensityPicker({ exerciseId, setIndex });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[70vh] flex flex-col">
          <SheetHeader className="border-b pb-3">
            <SheetTitle className="text-foreground">Edit Workout</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {editExercises.map((we) => {
              const exercise = allExercises.find(e => e.id === we.exerciseId);
              const completedForExercise = editCompleted[we.exerciseId] || [];
              const exerciseName = exercise?.name || 'Unknown';

              return (
                <div key={we.exerciseId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm">{exerciseName}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveExercise(we.exerciseId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Completed sets */}
                  {completedForExercise.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      {completedForExercise.map((cs, ci) => (
                        <div key={ci} className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-sm text-foreground">{cs.weight}kg</span>
                          <span className="text-muted-foreground">×</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-sm font-medium text-primary"
                            onClick={() => openCompletedRepsPicker(we.exerciseId, ci)}
                          >
                            {cs.reps} reps
                          </Button>
                          {cs.intensity && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {INTENSITY_LABELS[cs.intensity]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Planned sets */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Planned</p>
                    {we.sets.map((set, si) => (
                      <div key={si} className="flex items-center gap-1 p-2 rounded-lg bg-secondary/50">
                        <span className="text-xs text-muted-foreground w-8 text-center shrink-0">
                          {completedForExercise.length + si + 1}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateSetWeight(we.exerciseId, si, set.weight - 2.5)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={set.weight}
                          onChange={(e) => updateSetWeight(we.exerciseId, si, Number(e.target.value))}
                          className="h-8 text-center min-w-0 w-16 text-foreground"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateSetWeight(we.exerciseId, si, set.weight + 2.5)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => openIntensityPicker(we.exerciseId, si)}
                        >
                          {set.intensity ? INTENSITY_LABELS[set.intensity as IntensityLevel] : '2 RIR'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeSetFromExercise(we.exerciseId, si)}
                          disabled={we.sets.length === 1 && completedForExercise.length === 0}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-foreground"
                      onClick={() => addSetToExercise(we.exerciseId)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Set
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button
              variant="outline"
              className="w-full text-foreground"
              onClick={() => setShowAddExercise(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </Button>
          </div>

          <div className="pt-3 border-t">
            <Button onClick={handleDone} className="w-full">
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Completed reps picker */}
      <PickerDialog
        open={repsPicker !== null}
        onOpenChange={(o) => !o && setRepsPicker(null)}
        title="Edit Reps"
        items={REPS_OPTIONS}
        value={repsPickerValue}
        onConfirm={(value) => {
          if (repsPicker) {
            setEditCompleted(prev => ({
              ...prev,
              [repsPicker.exerciseId]: (prev[repsPicker.exerciseId] || []).map((s, i) =>
                i === repsPicker.completedIndex ? { ...s, reps: value } : s
              ),
            }));
          }
        }}
      />

      {/* Intensity picker */}
      <PickerDialog
        open={intensityPicker !== null}
        onOpenChange={(o) => !o && setIntensityPicker(null)}
        title="Select Intensity"
        items={INTENSITY_OPTIONS}
        value={intensityPickerValue}
        onConfirm={(value) => {
          if (intensityPicker) {
            updateSetIntensity(intensityPicker.exerciseId, intensityPicker.setIndex, value);
          }
        }}
        getLabel={(item) => INTENSITY_LABELS[item]}
      />

      {/* Add exercise sheet */}
      <ExerciseMultiSelectSheet
        open={showAddExercise}
        onOpenChange={setShowAddExercise}
        existingExerciseIds={editExercises.map(e => e.exerciseId)}
        onAdd={handleAddExercises}
      />

      {/* Confirm remove exercise */}
      <AlertDialog open={confirmRemoveExercise !== null} onOpenChange={(o) => !o && setConfirmRemoveExercise(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              This exercise has completed sets that will be removed from the log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemoveExercise && doRemoveExercise(confirmRemoveExercise)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
