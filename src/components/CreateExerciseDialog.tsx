import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useHeaderContext } from './Layout';

const categories = Object.keys(categoryLabels) as Exercise['category'][];

export function CreateExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Exercise['category']>('chest');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [description, setDescription] = useState('');

  const addCustomExercise = useWorkoutStore((state) => state.addCustomExercise);
  const { setIsOverlayOpen } = useHeaderContext();

  useEffect(() => {
    setIsOverlayOpen(open);
  }, [open, setIsOverlayOpen]);

  const handleSubmit = () => {
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

    addCustomExercise(newExercise);
    toast.success('Exercise created!');
    
    // Reset form
    setName('');
    setCategory('chest');
    setMuscleGroup('');
    setDescription('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0">
          <Plus className="w-4 h-4 mr-1" />
          Add Exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Exercise</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Exercise Name</Label>
            <Input
              id="name"
              placeholder="e.g., Bulgarian Split Squat"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
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
            <Label htmlFor="muscleGroup">Muscle Group</Label>
            <Input
              id="muscleGroup"
              placeholder="e.g., Quadriceps"
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the exercise..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Create Exercise
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
