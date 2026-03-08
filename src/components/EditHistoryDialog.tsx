import { useState, useEffect } from 'react';
import { WorkoutLog, CompletedSet, INTENSITY_LABELS, SET_TYPE_LABELS, IntensityLevel, SetType } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dumbbell, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EditHistoryDialogProps {
  log: WorkoutLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedLog: WorkoutLog) => void;
}

export function EditHistoryDialog({ log, open, onOpenChange, onSave }: EditHistoryDialogProps) {
  const [editData, setEditData] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    if (log && open) {
      setEditData(JSON.parse(JSON.stringify(log)));
    }
  }, [log, open]);

  if (!editData) return null;

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof CompletedSet, value: number | string) => {
    setEditData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, exercises: prev.exercises.map((ex, ei) => 
        ei === exerciseIndex ? {
          ...ex,
          sets: ex.sets.map((s, si) => si === setIndex ? { ...s, [field]: value } : s)
        } : ex
      )};
      return updated;
    });
  };

  const handleSave = () => {
    if (editData) {
      onSave(editData);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Workout</DialogTitle>
          <p className="text-sm text-muted-foreground">{editData.workoutName}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 -mx-6 px-6 pb-4">
          {editData.exercises.map((exercise, ei) => (
            <div key={ei} className="space-y-2">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{exercise.exerciseName}</span>
              </div>

              <div className="pl-6 space-y-1.5">
                <div className="grid grid-cols-[32px_1fr_1fr] gap-2 text-xs text-muted-foreground">
                  <span>Set</span>
                  <span>Weight (kg)</span>
                  <span>Reps</span>
                </div>
                {exercise.sets.map((set, si) => (
                  <div key={si} className="grid grid-cols-[32px_1fr_1fr] gap-2 items-center">
                    <span className="text-sm text-muted-foreground">{si + 1}</span>
                    <Input
                      type="number"
                      value={set.weight}
                      onChange={(e) => updateSet(ei, si, 'weight', parseFloat(e.target.value) || 0)}
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(ei, si, 'reps', parseInt(e.target.value) || 0)}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-3 border-t border-border">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button className="flex-1" glow onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
