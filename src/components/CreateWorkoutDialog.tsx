import { useState } from 'react';
import { Plus, X, Minus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exercises } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { WorkoutExercise, WorkoutSet } from '@/types/workout';
import { useToast } from '@/hooks/use-toast';
import { ExerciseCard } from './ExerciseCard';

export function CreateWorkoutDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  const [step, setStep] = useState<'name' | 'exercises' | 'configure'>('name');
  const [exerciseSearch, setExerciseSearch] = useState('');
  
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
      // Start with one set, weight 0, no reps (reps logged during workout)
      return [...prev, { exerciseId, sets: [{ weight: 0 }] }];
    });
  };

  const addSet = (exerciseId: string) => {
    setSelectedExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: [...e.sets, { weight: 0 }] }
          : e
      )
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

    // Reset
    setName('');
    setSelectedExercises([]);
    setStep('name');
    setOpen(false);
  };

  const resetAndClose = () => {
    setName('');
    setSelectedExercises([]);
    setStep('name');
    setExerciseSearch('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetAndClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 w-full">
          <Plus className="w-5 h-5" />
          Create Workout
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'name' && 'Name Your Workout'}
            {step === 'exercises' && 'Select Exercises'}
            {step === 'configure' && 'Configure Sets & Weights'}
          </DialogTitle>
        </DialogHeader>

        {step === 'name' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workout-name">Workout Name</Label>
              <Input
                id="workout-name"
                placeholder="e.g., Push Day, Leg Day..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => setStep('exercises')}
              disabled={!name.trim()}
            >
              Next: Select Exercises
            </Button>
          </div>
        )}

        {step === 'exercises' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="space-y-3 mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedExercises.length} exercises selected
              </p>
            </div>
            <ScrollArea className="flex-1 h-[300px] -mx-6 px-6">
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
            </ScrollArea>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('name')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setStep('configure')} 
                disabled={selectedExercises.length === 0}
                className="flex-1"
              >
                Next: Configure
              </Button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="flex flex-col flex-1 min-h-0">
            <p className="text-sm text-muted-foreground mb-3">
              Set the weight for each set. Reps will be logged during your workout.
            </p>
            <ScrollArea className="flex-1 h-[300px] -mx-6 px-6">
              <div className="space-y-4 pb-4">
                {selectedExercises.map((we) => {
                  const exercise = allExercises.find((e) => e.id === we.exerciseId);
                  if (!exercise) return null;
                  return (
                    <div key={we.exerciseId} className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{exercise.name}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => toggleExercise(we.exerciseId)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="grid grid-cols-[auto_1fr_auto] gap-2 text-xs text-muted-foreground px-2">
                          <span>Set</span>
                          <span>Weight (kg)</span>
                          <span></span>
                        </div>
                        
                        {we.sets.map((set, setIndex) => (
                          <div
                            key={setIndex}
                            className="grid grid-cols-[auto_1fr_auto] gap-2 items-center p-2 bg-background/50 rounded-lg"
                          >
                            <span className="w-6 text-center text-sm font-medium">{setIndex + 1}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateSetWeight(we.exerciseId, setIndex, set.weight - 2.5)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                value={set.weight}
                                onChange={(e) => updateSetWeight(we.exerciseId, setIndex, Number(e.target.value))}
                                className="h-8 text-center"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateSetWeight(we.exerciseId, setIndex, set.weight + 2.5)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeSet(we.exerciseId, setIndex)}
                              disabled={we.sets.length === 1}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        
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
            </ScrollArea>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('exercises')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleCreate} className="flex-1">
                Create Workout
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
