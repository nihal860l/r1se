import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Trash2, ChevronRight, ArrowLeft, Dumbbell } from 'lucide-react';
import { exercises as DEFAULT_EXERCISES } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { useExerciseSearch } from '@/lib/exerciseSearch';
import { ExerciseCard } from '@/components/ExerciseCard';
import { CreateSetRow } from '@/components/CreateSetRow';
import { PickerDialog } from '@/components/PickerDialog';
import { InlineCreateExerciseDialog } from '@/components/InlineCreateExerciseDialog';
import type { ProgramWeekDay, ProgramExercise, ProgramSet } from '@/hooks/usePrograms';
import {
  SetType,
  IntensityLevel,
  SET_TYPE_LABELS,
  INTENSITY_LABELS,
} from '@/types/workout';

const SET_TYPE_OPTIONS: SetType[] = ['normal', 'superset', 'alternating', 'challenge'];
const INTENSITY_OPTIONS: IntensityLevel[] = ['warmup', '2rir', '1rir', 'failure'];

interface DayWorkoutEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: ProgramWeekDay;
  dayLabel: string;
  onSave: (day: ProgramWeekDay) => void;
}

export function DayWorkoutEditor({ open, onOpenChange, day, dayLabel, onSave }: DayWorkoutEditorProps) {
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const allExercises = [...DEFAULT_EXERCISES, ...customExercises];

  const [workoutName, setWorkoutName] = useState(day.workoutName || '');
  const [exercises, setExercises] = useState<ProgramExercise[]>(day.exercises || []);
  const [step, setStep] = useState<'configure' | 'select'>('configure');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [setTypePicker, setSetTypePicker] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const [intensityPicker, setIntensityPicker] = useState<{ exIdx: number; setIdx: number } | null>(null);

  const filteredExercises = useExerciseSearch(allExercises, exerciseSearch);

  const handleSave = () => {
    onSave({ label: dayLabel, workoutName: workoutName.trim(), exercises });
    onOpenChange(false);
  };

  const addExercise = (ex: { id: string; name: string }) => {
    setExercises(prev => [...prev, {
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: [{ targetReps: 10, targetWeight: undefined, intensity: '2rir', setType: 'normal' }],
    }]);
    setStep('configure');
  };

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { targetReps: lastSet?.targetReps || 10, targetWeight: lastSet?.targetWeight, intensity: lastSet?.intensity, setType: lastSet?.setType }] };
    }));
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const newSets = ex.sets.filter((_, si) => si !== setIdx);
      return newSets.length > 0 ? { ...ex, sets: newSets } : ex;
    }).filter(ex => ex.sets.length > 0));
  };

  const updateSet = (exIdx: number, setIdx: number, updates: Partial<ProgramSet>) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, ...updates } : s) };
    }));
  };

  // Map ProgramSet to CreateSetRow props
  const getWeight = (set: ProgramSet) => set.targetWeight || 0;
  const getSetType = (set: ProgramSet) => (set.setType as SetType) || 'normal';
  const getIntensity = (set: ProgramSet) => (set.intensity as IntensityLevel) || '2rir';

  const currentSetTypeValue = setTypePicker
    ? getSetType(exercises[setTypePicker.exIdx]?.sets[setTypePicker.setIdx])
    : 'normal';
  const currentIntensityValue = intensityPicker
    ? getIntensity(exercises[intensityPicker.exIdx]?.sets[intensityPicker.setIdx])
    : '2rir';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              {step === 'select' ? (
                <Button variant="ghost" size="icon" onClick={() => setStep('configure')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              ) : null}
              <div className="flex-1">
                <DialogTitle className="text-lg">
                  {step === 'select' ? 'Select Exercises' : dayLabel}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === 'select' ? `${exercises.length} exercises selected` : 'Build workout for this day'}
                </p>
              </div>
            </div>
          </div>

          {step === 'configure' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2">
                <Label>Workout Name</Label>
                <Input
                  value={workoutName}
                  onChange={e => setWorkoutName(e.target.value)}
                  placeholder="e.g. Push Day, Upper Body..."
                  className="h-10"
                />
              </div>

              {exercises.map((ex, exIdx) => {
                const exDef = allExercises.find(e => e.id === ex.exerciseId);
                return (
                  <div key={exIdx} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-3.5 h-3.5 text-primary" />
                        <h4 className="font-semibold text-sm">{ex.exerciseName || exDef?.name}</h4>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeExercise(exIdx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {ex.sets.some(s => getSetType(s) !== 'challenge') && (
                      <div className="grid grid-cols-[48px_1fr_64px_48px] gap-2 text-xs text-muted-foreground px-1">
                        <span className="text-center">Set</span>
                        <span>Weight (kg)</span>
                        <span className="text-center">Intensity</span>
                        <span></span>
                      </div>
                    )}

                    {ex.sets.map((set, setIdx) => (
                      <CreateSetRow
                        key={setIdx}
                        index={setIdx}
                        weight={getWeight(set)}
                        setType={getSetType(set)}
                        intensity={getIntensity(set)}
                        targetReps={set.targetReps}
                        isOnlySet={ex.sets.length === 1}
                        onWeightChange={(w) => updateSet(exIdx, setIdx, { targetWeight: w })}
                        onOpenIntensityPicker={() => setIntensityPicker({ exIdx, setIdx })}
                        onOpenSetTypePicker={() => setSetTypePicker({ exIdx, setIdx })}
                        onRemoveSet={() => removeSet(exIdx, setIdx)}
                        onTargetRepsChange={(r) => updateSet(exIdx, setIdx, { targetReps: r })}
                      />
                    ))}

                    <Button variant="outline" size="sm" className="w-full mt-1 text-foreground" onClick={() => addSet(exIdx)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Set
                    </Button>
                  </div>
                );
              })}

              <Button variant="outline" className="w-full text-foreground" onClick={() => setStep('select')}>
                <Plus className="w-4 h-4 mr-2" /> Add Exercise
              </Button>
            </div>
          )}

          {step === 'select' && (
            <div className="flex-1 overflow-hidden flex flex-col p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChange={e => setExerciseSearch(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredExercises.map(exercise => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    selected={exercises.some(e => e.exerciseId === exercise.id)}
                    onClick={() => {
                      if (exercises.some(e => e.exerciseId === exercise.id)) {
                        setExercises(prev => prev.filter(e => e.exerciseId !== exercise.id));
                      } else {
                        addExercise({ id: exercise.id, name: exercise.name });
                      }
                    }}
                    showEdit={false}
                  />
                ))}
                {filteredExercises.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No exercises found</p>
                )}
                <Button variant="outline" className="w-full mt-2 text-foreground" onClick={() => setShowCreateExercise(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create New Exercise
                </Button>
              </div>
              <div className="pt-3 border-t mt-3">
                <Button className="w-full" onClick={() => setStep('configure')}>
                  Done Selecting ({exercises.length})
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 'configure' && (
            <div className="p-4 border-t">
              <Button className="w-full" onClick={handleSave} disabled={exercises.length === 0 && !workoutName.trim()}>
                Save Day Workout
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reuse existing pickers */}
      <PickerDialog
        open={!!setTypePicker}
        onOpenChange={() => setSetTypePicker(null)}
        title="Set Type"
        items={SET_TYPE_OPTIONS}
        value={currentSetTypeValue}
        getLabel={(v) => SET_TYPE_LABELS[v]}
        onConfirm={(v) => {
          if (setTypePicker) {
            updateSet(setTypePicker.exIdx, setTypePicker.setIdx, { setType: v });
            setSetTypePicker(null);
          }
        }}
      />

      <PickerDialog
        open={!!intensityPicker}
        onOpenChange={() => setIntensityPicker(null)}
        title="Intensity"
        items={INTENSITY_OPTIONS}
        value={currentIntensityValue}
        getLabel={(v) => INTENSITY_LABELS[v]}
        onConfirm={(v) => {
          if (intensityPicker) {
            updateSet(intensityPicker.exIdx, intensityPicker.setIdx, { intensity: v });
            setIntensityPicker(null);
          }
        }}
      />

      <InlineCreateExerciseDialog
        open={showCreateExercise}
        onOpenChange={setShowCreateExercise}
        onExerciseCreated={(exerciseId) => {
          const ex = [...DEFAULT_EXERCISES, ...customExercises].find(e => e.id === exerciseId);
          if (ex) addExercise({ id: ex.id, name: ex.name });
        }}
      />
    </>
  );
}
