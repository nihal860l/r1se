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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkoutStore } from '@/store/workoutStore';
import { Exercise } from '@/types/workout';
import { allMuscleGroups } from '@/data/exercises';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useHeaderContext } from './Layout';

interface EditExerciseDialogProps {
  exercise: Exercise;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditExerciseDialog({ exercise, open, onOpenChange }: EditExerciseDialogProps) {
  const { customMuscleGroups, exerciseMuscleOverrides, addCustomMuscleGroup, setExerciseMuscleGroup } = useWorkoutStore();
  const { setIsOverlayOpen } = useHeaderContext();

  const combinedMuscleGroups = [...new Set([...allMuscleGroups, ...customMuscleGroups])].sort();

  const currentMuscleGroup = exerciseMuscleOverrides[exercise.id] || exercise.muscleGroup;
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(currentMuscleGroup);
  const [newMuscleGroup, setNewMuscleGroup] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);

  useEffect(() => {
    setIsOverlayOpen(open);
  }, [open, setIsOverlayOpen]);

  const handleSave = () => {
    setExerciseMuscleGroup(exercise.id, selectedMuscleGroup);
    toast.success('Muscle group updated!');
    onOpenChange(false);
  };

  const handleAddNewMuscleGroup = () => {
    if (!newMuscleGroup.trim()) {
      toast.error('Please enter a muscle group name');
      return;
    }
    const trimmed = newMuscleGroup.trim();
    addCustomMuscleGroup(trimmed);
    setSelectedMuscleGroup(trimmed);
    setNewMuscleGroup('');
    setShowAddNew(false);
    toast.success('Muscle group added!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Exercise</Label>
            <p className="text-sm text-muted-foreground">{exercise.name}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="muscleGroup">Primary Muscle Group</Label>
            <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {combinedMuscleGroups.map((mg) => (
                  <SelectItem key={mg} value={mg}>
                    {mg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!showAddNew ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddNew(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Custom Muscle Group
            </Button>
          ) : (
            <div className="space-y-2 p-3 border rounded-lg bg-secondary/30">
              <Label htmlFor="newMuscleGroup">New Muscle Group</Label>
              <div className="flex gap-2">
                <Input
                  id="newMuscleGroup"
                  placeholder="e.g., Hip Flexors"
                  value={newMuscleGroup}
                  onChange={(e) => setNewMuscleGroup(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewMuscleGroup()}
                />
                <Button size="sm" onClick={handleAddNewMuscleGroup}>
                  Add
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddNew(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          <Button onClick={handleSave} className="w-full">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
