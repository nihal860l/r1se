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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkoutStore } from '@/store/workoutStore';
import { Exercise } from '@/types/workout';
import { categoryLabels } from '@/data/exercises';
import { toast } from 'sonner';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useAuth } from '@/hooks/useAuth';

const categories = Object.keys(categoryLabels) as Exercise['category'][];

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
  const [category, setCategory] = useState<Exercise['category']>('chest');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [description, setDescription] = useState('');

  const addCustomExercise = useWorkoutStore((state) => state.addCustomExercise);
  const { user } = useAuth();
  const { pushExercise } = useCloudSync();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setCategory('chest');
      setMuscleGroup('');
      setDescription('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter an exercise name');
      return;
    }
    if (!muscleGroup.trim()) {
      toast.error('Please enter a muscle group');
      return;
    }

    const newExercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      category,
      muscleGroup: muscleGroup.trim(),
      description: description.trim() || 'Custom exercise',
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
            <Label htmlFor="inline-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Exercise['category'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inline-muscleGroup">Primary Muscle Group</Label>
            <Input
              id="inline-muscleGroup"
              placeholder="e.g., Quadriceps"
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
            />
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
