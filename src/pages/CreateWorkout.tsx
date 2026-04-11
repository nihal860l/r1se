import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Trash2, ArrowLeft, ChevronRight, X, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exercises } from '@/data/exercises';
import { useExerciseSearch } from '@/lib/exerciseSearch';
import { useWorkoutStore } from '@/store/workoutStore';
import { 
  WorkoutExercise, 
  SetType, 
  IntensityLevel,
  SET_TYPE_LABELS,
  INTENSITY_LABELS,
} from '@/types/workout';
import { useToast } from '@/hooks/use-toast';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Layout } from '@/components/Layout';
import { PickerDialog } from '@/components/PickerDialog';
import { CreateSetRow } from '@/components/CreateSetRow';
import { InlineCreateExerciseDialog } from '@/components/InlineCreateExerciseDialog';
import { ExerciseMultiSelectSheet } from '@/components/ExerciseMultiSelectSheet';
import { useUndoHistory } from '@/hooks/useUndoHistory';
import { useDraggableList } from '@/hooks/useDraggableList';
import { GripVertical } from 'lucide-react';
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

const SET_TYPE_OPTIONS: SetType[] = ['normal', 'superset', 'alternating', 'challenge'];
const INTENSITY_OPTIONS: IntensityLevel[] = ['warmup', '2rir', '1rir', 'failure'];

interface EditorSnapshot {
  name: string;
  selectedExercises: WorkoutExercise[];
}

export default function CreateWorkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editWorkoutId = searchParams.get('edit');
  const isEditMode = Boolean(editWorkoutId);

  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  const [step, setStep] = useState<'name' | 'exercises' | 'configure'>('name');
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  
  const [setTypePicker, setSetTypePicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [intensityPicker, setIntensityPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const workouts = useWorkoutStore((state) => state.workouts);
  const addWorkout = useWorkoutStore((state) => state.addWorkout);
  const updateWorkout = useWorkoutStore((state) => state.updateWorkout);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { toast } = useToast();

  // Undo system
  const { canUndo, pushState, undo } = useUndoHistory<EditorSnapshot>();

  const saveSnapshot = useCallback(() => {
    pushState({ name, selectedExercises });
  }, [name, selectedExercises, pushState]);

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) {
      setName(prev.name);
      setSelectedExercises(prev.selectedExercises);
      toast({ title: 'Undone', description: 'Reverted to previous state.' });
    }
  }, [undo, toast]);

  // Guard: only hydrate from existing workout ONCE
  const hasHydratedEdit = useRef(false);

  useEffect(() => {
    if (hasHydratedEdit.current) return;
    if (editWorkoutId && workouts.length > 0) {
      const existing = workouts.find((w) => w.id === editWorkoutId);
      if (existing) {
        setName(existing.name);
        setSelectedExercises(existing.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })));
        setStep('configure');
        hasHydratedEdit.current = true;
      }
    }
  }, [editWorkoutId, workouts]);

  const handleCancel = () => {
    if (!name.trim() && selectedExercises.length === 0) {
      navigate(-1);
      return;
    }
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    navigate(-1);
  };

  const allExercises = [...exercises, ...customExercises];

  const handleAddExercises = (exerciseIds: string[]) => {
    saveSnapshot();
    setSelectedExercises(prev => [
      ...prev,
      ...exerciseIds.map(id => ({
        exerciseId: id,
        sets: [{ weight: 0, setType: 'normal' as SetType, intensity: '2rir' as IntensityLevel }],
      })),
    ]);
  };

  const toggleExercise = (exerciseId: string) => {
    saveSnapshot();
    setSelectedExercises((prev) => {
      const exists = prev.find((e) => e.exerciseId === exerciseId);
      if (exists) {
        return prev.filter((e) => e.exerciseId !== exerciseId);
      }
      return [...prev, { 
        exerciseId, 
        sets: [{ weight: 0, setType: 'normal' as SetType, intensity: '2rir' as IntensityLevel }] 
      }];
    });
  };

  // Drag-to-reorder
  const { dragHandleProps, dragOverIndex, dragIndex } = useDraggableList(
    selectedExercises,
    (newItems) => {
      saveSnapshot();
      setSelectedExercises(newItems);
    }
  );

  const addSet = (exerciseId: string) => {
    saveSnapshot();
    setSelectedExercises((prev) =>
      prev.map((e) => {
        if (e.exerciseId !== exerciseId) return e;
        const lastSet = e.sets[e.sets.length - 1];
        return { 
          ...e, 
          sets: [...e.sets, { 
            weight: lastSet?.weight || 0, 
            setType: lastSet?.setType || 'normal' as SetType,
            intensity: lastSet?.intensity || '2rir' as IntensityLevel,
          }] 
        };
      })
    );
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    saveSnapshot();
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
          : e
      ).filter((e) => e.sets.length > 0)
    );
  };

  const updateSetWeight = (exerciseId: string, setIndex: number, weight: number) => {
    saveSnapshot();
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s, i) =>
                i === setIndex ? { ...s, weight: Math.max(0, weight) } : s
              ),
            }
          : e
      )
    );
  };

  const updateSetType = (exerciseId: string, setIndex: number, setType: SetType) => {
    saveSnapshot();
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s, i) =>
                i === setIndex ? { 
                  ...s, 
                  setType,
                  ...(setType === 'challenge' ? { targetReps: s.targetReps || 30 } : {}),
                } : s
              ),
            }
          : e
      )
    );
  };

  const updateSetTargetReps = (exerciseId: string, setIndex: number, targetReps: number) => {
    saveSnapshot();
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s, i) =>
                i === setIndex ? { ...s, targetReps } : s
              ),
            }
          : e
      )
    );
  };

  const updateSetIntensity = (exerciseId: string, setIndex: number, intensity: IntensityLevel) => {
    saveSnapshot();
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s, i) =>
                i === setIndex ? { ...s, intensity } : s
              ),
            }
          : e
      )
    );
  };

  const handleInlineExerciseCreated = (exerciseId: string) => {
    saveSnapshot();
    setSelectedExercises((prev) => [
      ...prev,
      {
        exerciseId,
        sets: [{ weight: 0, setType: 'normal' as SetType, intensity: '2rir' as IntensityLevel }],
      },
    ]);
  };

  const handleSave = () => {
    if (!name.trim() || selectedExercises.length === 0) return;

    if (isEditMode && editWorkoutId) {
      const existingWorkout = workouts.find((w) => w.id === editWorkoutId);
      updateWorkout(editWorkoutId, {
        id: editWorkoutId,
        name: name.trim(),
        exercises: selectedExercises,
        createdAt: existingWorkout?.createdAt || new Date(),
      });
      toast({
        title: 'Workout updated!',
        description: `${name} has been saved.`,
      });
    } else {
      addWorkout({
        id: crypto.randomUUID(),
        name: name.trim(),
        exercises: selectedExercises,
        createdAt: new Date(),
      });
      toast({
        title: 'Workout created!',
        description: `${name} has been added to your workouts.`,
      });
    }

    navigate(-1);
  };

  const currentSetTypeValue = setTypePicker
    ? selectedExercises.find(e => e.exerciseId === setTypePicker.exerciseId)?.sets[setTypePicker.setIndex]?.setType ?? 'normal'
    : 'normal';
    
  const currentIntensityValue = intensityPicker
    ? selectedExercises.find(e => e.exerciseId === intensityPicker.exerciseId)?.sets[intensityPicker.setIndex]?.intensity ?? '2rir'
    : '2rir';

  return (
    <Layout hideNav>
      <div className="container max-w-lg animate-fade-in px-4 flex flex-col min-h-[calc(100vh-60px)]">
        {/* Header */}
        <div className="pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground"
              onClick={() => {
                if (step === 'name') handleCancel();
                else if (step === 'exercises') setStep('name');
                else setStep('exercises');
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {step === 'name' && (isEditMode ? 'Edit Workout' : 'Name Your Workout')}
                {step === 'exercises' && 'Select Exercises'}
                {step === 'configure' && 'Configure Sets'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {step === 'name' && (isEditMode ? 'Update your workout name' : 'Give your workout a memorable name')}
                {step === 'exercises' && `${selectedExercises.length} exercises selected`}
                {step === 'configure' && 'Set weight, type, and intensity for each set'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Undo button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={!canUndo}
              className="text-foreground disabled:opacity-30"
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Step: Name */}
        {step === 'name' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="workout-name">Workout Name</Label>
                <Input
                  id="workout-name"
                  placeholder="e.g., Push Day, Leg Day..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="text-lg h-12"
                />
              </div>
            </div>
            <div className="pb-6">
              <Button 
                className="w-full h-12 text-base" 
                onClick={() => setStep('exercises')}
                disabled={!name.trim()}
              >
                Next: Select Exercises
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Exercises — now uses bottom sheet */}
        {step === 'exercises' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground text-sm">
                {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected
              </p>
              {selectedExercises.length > 0 && (
                <div className="w-full max-w-sm space-y-2">
                  {selectedExercises.map((we) => {
                    const ex = allExercises.find(e => e.id === we.exerciseId);
                    return (
                      <div key={we.exerciseId} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <span className="text-sm font-medium text-foreground">{ex?.name || 'Unknown'}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => toggleExercise(we.exerciseId)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button variant="outline" className="text-foreground" onClick={() => setShowExerciseSheet(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Exercises
              </Button>
            </div>
            <div className="py-4 border-t">
              <Button 
                onClick={() => setStep('configure')} 
                disabled={selectedExercises.length === 0}
                className="w-full h-12 text-base"
              >
                Next: Configure Sets
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <ExerciseMultiSelectSheet
              open={showExerciseSheet}
              onOpenChange={setShowExerciseSheet}
              existingExerciseIds={selectedExercises.map(e => e.exerciseId)}
              onAdd={handleAddExercises}
            />
          </div>
        )}

        {/* Step: Configure */}
        {step === 'configure' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pb-24">
              <div className="space-y-6 pb-4">
                {selectedExercises.map((we, idx) => {
                  const exercise = allExercises.find((e) => e.id === we.exerciseId);
                  if (!exercise) return null;
                  
                  return (
                    <div key={`${we.exerciseId}-${idx}`} className={`bg-secondary/50 rounded-lg p-4 ${dragIndex === idx ? 'opacity-50 shadow-lg' : ''} ${dragOverIndex === idx ? 'border-2 border-primary/40' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div {...dragHandleProps(idx)} className="text-muted-foreground cursor-grab active:cursor-grabbing p-1">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-foreground">{exercise.name}</h4>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => toggleExercise(we.exerciseId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Only show grid header if there are non-challenge sets */}
                        {we.sets.some((s) => (s.setType || 'normal') !== 'challenge') && (
                          <div className="grid grid-cols-[48px_1fr_64px_48px] gap-2 text-xs text-muted-foreground px-1">
                            <span className="text-center">Set</span>
                            <span>Weight (kg)</span>
                            <span className="text-center">Intensity</span>
                            <span></span>
                          </div>
                        )}

                        {we.sets.map((set, setIndex) => (
                          <CreateSetRow
                            key={setIndex}
                            index={setIndex}
                            weight={set.weight}
                            setType={set.setType || 'normal'}
                            intensity={set.intensity || '2rir'}
                            targetReps={set.targetReps}
                            isOnlySet={we.sets.length === 1}
                            onWeightChange={(weight) => updateSetWeight(we.exerciseId, setIndex, weight)}
                            onOpenIntensityPicker={() => setIntensityPicker({ exerciseId: we.exerciseId, setIndex })}
                            onOpenSetTypePicker={() => setSetTypePicker({ exerciseId: we.exerciseId, setIndex })}
                            onRemoveSet={() => removeSet(we.exerciseId, setIndex)}
                            onTargetRepsChange={(reps) => updateSetTargetReps(we.exerciseId, setIndex, reps)}
                          />
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-foreground"
                          onClick={() => addSet(we.exerciseId)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Set
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Exercise button in configure step */}
                <Button
                  variant="outline"
                  className="w-full text-foreground"
                  onClick={() => setShowExerciseSheet(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise
                </Button>
                <ExerciseMultiSelectSheet
                  open={showExerciseSheet}
                  onOpenChange={setShowExerciseSheet}
                  existingExerciseIds={selectedExercises.map(e => e.exerciseId)}
                  onAdd={handleAddExercises}
                />
              </div>
            </div>
            {/* Sticky bottom save bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-50">
              <div className="container max-w-lg mx-auto">
                <Button onClick={handleSave} className="w-full h-12 text-base">
                  {isEditMode ? 'Save Changes' : 'Create Workout'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Set Type Picker Dialog */}
      <PickerDialog
        open={setTypePicker !== null}
        onOpenChange={(open) => !open && setSetTypePicker(null)}
        title="Select Set Type"
        items={SET_TYPE_OPTIONS}
        value={currentSetTypeValue}
        onConfirm={(value) => {
          if (setTypePicker) {
            updateSetType(setTypePicker.exerciseId, setTypePicker.setIndex, value);
          }
        }}
        getLabel={(item) => SET_TYPE_LABELS[item]}
      />

      {/* Intensity Picker Dialog */}
      <PickerDialog
        open={intensityPicker !== null}
        onOpenChange={(open) => !open && setIntensityPicker(null)}
        title="Select Intensity Target"
        items={INTENSITY_OPTIONS}
        value={currentIntensityValue}
        onConfirm={(value) => {
          if (intensityPicker) {
            updateSetIntensity(intensityPicker.exerciseId, intensityPicker.setIndex, value);
          }
        }}
        getLabel={(item) => INTENSITY_LABELS[item]}
      />

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
            <AlertDialogTitle>Cancel {isEditMode ? 'Editing' : 'Workout Creation'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be lost. Are you sure you want to go back?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
