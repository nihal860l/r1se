import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWorkoutStore } from '@/store/workoutStore';
import { Exercise } from '@/types/workout';
import { generateKeywords, muscleToCategory } from '@/lib/exerciseSearch';
import { toast } from 'sonner';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useAuth } from '@/hooks/useAuth';

interface InlineCreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExerciseCreated: (exerciseId: string) => void;
}

export function InlineCreateExerciseDialog({
  open,
  onOpenChange,
  onExerciseCreated,
}: InlineCreateExerciseDialogProps) {
  const [name, setName] = useState('');
  const [musclesInput, setMusclesInput] = useState('');
  const [description, setDescription] = useState('');

  const addCustomExercise = useWorkoutStore((state) => state.addCustomExercise);
  const { user } = useAuth();
  const { pushExercise } = useCloudSync();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setMusclesInput('');
      setDescription('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter an exercise name');
      return;
    }
    if (!musclesInput.trim()) {
      toast.error('Please enter at least one muscle');
      return;
    }

    const muscles = musclesInput
      .split(/[,\/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const category = muscleToCategory(muscles[0]);

    const newExercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      muscles,
      keywords: generateKeywords(name.trim(), muscles),
      isDefault: false,
      category,
      muscleGroup: muscles[0],
      description: description.trim() || name.trim(),
      isCustom: true,
    };

    // Add to local state
    addCustomExercise(newExercise);

    // Sync to cloud if logged in
    if (user) {
      await pushExercise(newExercise);
    }

    toast.success('Exercise created!');

    // Close dialog and notify parent with new exercise ID
    onOpenChange(false);
    onExerciseCreated(newExercise.id);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Exercise</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="inline-name">Exercise Name</Label>
            <Input
              id="inline-name"
              placeholder="e.g., Bulgarian Split Squat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inline-muscles">Muscles (separate with comma or /)</Label>
            <Input
              id="inline-muscles"
              placeholder="e.g., Quadriceps, Glutes"
              value={musclesInput}
              onChange={(e) => setMusclesInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              e.g. "Upper Chest / Triceps Lateral Head"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inline-description">Notes / Description (optional)</Label>
            <Textarea
              id="inline-description"
              placeholder="Describe the exercise..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="pt-4 space-y-2 border-t">
          <Button onClick={handleSubmit} className="w-full">
            Save & Add to Workout
          </Button>
          <Button variant="outline" onClick={handleCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
