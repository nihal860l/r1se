import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Search, Trash2, ChevronDown, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exercises } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { 
  WorkoutExercise, 
  SetType, 
  IntensityLevel,
  SET_TYPE_LABELS,
  SET_TYPE_SHORT_LABELS,
  INTENSITY_LABELS,
} from '@/types/workout';
import { useToast } from '@/hooks/use-toast';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Layout } from '@/components/Layout';
import { PickerDialog } from '@/components/PickerDialog';

// Set type options (no dropset)
const SET_TYPE_OPTIONS: SetType[] = ['normal', 'superset', 'alternating'];
const INTENSITY_OPTIONS: IntensityLevel[] = ['warmup', '2rir', '1rir', 'failure'];

export default function CreateWorkout() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  const [step, setStep] = useState<'name' | 'exercises' | 'configure'>('name');
  const [exerciseSearch, setExerciseSearch] = useState('');
  
  // Picker state for set type and intensity
  const [setTypePicker, setSetTypePicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [intensityPicker, setIntensityPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  
  const addWorkout = useWorkoutStore((state) => state.addWorkout);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { toast } = useToast();

  const allExercises = [...exercises, ...customExercises];
  
  const filteredExercises = allExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    exercise.muscleGroup.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const toggleExercise = (exerciseId: string) => {
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

  const addSet = (exerciseId: string) => {
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
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
          : e
      ).filter((e) => e.sets.length > 0)
    );
  };

  const updateSetWeight = (exerciseId: string, setIndex: number, weight: number) => {
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
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s, i) =>
                i === setIndex ? { ...s, setType } : s
              ),
            }
          : e
      )
    );
  };

  const updateSetIntensity = (exerciseId: string, setIndex: number, intensity: IntensityLevel) => {
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

  const handleCreate = () => {
    if (!name.trim() || selectedExercises.length === 0) return;

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

    navigate('/');
  };

  // Get current picker values
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
        <div className="pt-4 pb-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step === 'name') navigate('/');
              else if (step === 'exercises') setStep('name');
              else setStep('exercises');
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">
              {step === 'name' && 'Name Your Workout'}
              {step === 'exercises' && 'Select Exercises'}
              {step === 'configure' && 'Configure Sets'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 'name' && 'Give your workout a memorable name'}
              {step === 'exercises' && `${selectedExercises.length} exercises selected`}
              {step === 'configure' && 'Set weight, type, and intensity for each set'}
            </p>
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

        {/* Step: Exercises */}
        {step === 'exercises' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2 pb-4">
                {filteredExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    selected={selectedExercises.some((e) => e.exerciseId === exercise.id)}
                    onClick={() => toggleExercise(exercise.id)}
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
          </div>
        )}

        {/* Step: Configure */}
        {step === 'configure' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 pb-4">
                {selectedExercises.map((we) => {
                  const exercise = allExercises.find((e) => e.id === we.exerciseId);
                  if (!exercise) return null;
                  
                  return (
                    <div key={we.exerciseId} className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{exercise.name}</h4>
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
                        {/* Header row */}
                        <div className="grid grid-cols-[48px_1fr_64px_48px] gap-2 text-xs text-muted-foreground px-1">
                          <span className="text-center">Set</span>
                          <span>Weight (kg)</span>
                          <span className="text-center">Intensity</span>
                          <span></span>
                        </div>
                        
                        {we.sets.map((set, setIndex) => {
                          const setType = set.setType || 'normal';
                          const isNormal = setType === 'normal';
                          
                          return (
                            <div
                              key={setIndex}
                              className="grid grid-cols-[48px_1fr_64px_48px] gap-2 items-center p-2 bg-background/50 rounded-lg"
                            >
                              {/* Set column - integrated with type */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-9 px-1 text-xs font-medium ${!isNormal ? 'text-primary' : ''}`}
                                onClick={() => setSetTypePicker({ exerciseId: we.exerciseId, setIndex })}
                              >
                                {isNormal ? (
                                  <span className="text-sm">{setIndex + 1}</span>
                                ) : (
                                  <span className="truncate">{SET_TYPE_SHORT_LABELS[setType]}</span>
                                )}
                                <ChevronDown className="w-3 h-3 ml-0.5 opacity-50 shrink-0" />
                              </Button>
                              
                              {/* Weight */}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => updateSetWeight(we.exerciseId, setIndex, set.weight - 2.5)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={set.weight}
                                  onChange={(e) => updateSetWeight(we.exerciseId, setIndex, Number(e.target.value))}
                                  className="h-9 text-center min-w-0"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => updateSetWeight(we.exerciseId, setIndex, set.weight + 2.5)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              {/* Intensity */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs px-1"
                                onClick={() => setIntensityPicker({ exerciseId: we.exerciseId, setIndex })}
                              >
                                <span className="truncate">
                                  {set.intensity ? INTENSITY_LABELS[set.intensity] : '2 RIR'}
                                </span>
                              </Button>
                              
                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSet(we.exerciseId, setIndex)}
                                disabled={we.sets.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => addSet(we.exerciseId)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Set
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="py-4 border-t">
              <Button onClick={handleCreate} className="w-full h-12 text-base">
                Create Workout
              </Button>
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
    </Layout>
  );
}
