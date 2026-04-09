import { WorkoutLog, INTENSITY_LABELS, SET_TYPE_LABELS } from '@/types/workout';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock, Calendar, Trash2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useState } from 'react';
import { EditHistoryDialog } from './EditHistoryDialog';

interface WorkoutHistoryDetailProps {
  log: WorkoutLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (log: WorkoutLog) => void;
}

export function WorkoutHistoryDetail({ log, open, onOpenChange, onDelete, onEdit }: WorkoutHistoryDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  if (!log) return null;

  const totalSets = log.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const totalVolume = log.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0
  );

  const handleDelete = () => {
    onDelete(log.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleSaveEdit = (updatedLog: WorkoutLog) => {
    onEdit(updatedLog);
    setShowEdit(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-xl">{log.workoutName}</DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => { onOpenChange(false); setShowEdit(true); }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(log.completedAt), 'EEEE, MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {log.duration} min
              </span>
            </div>
          </DialogHeader>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 py-3">
            <div className="bg-secondary/60 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-primary">{log.exercises.length}</p>
              <p className="text-xs text-muted-foreground">Exercises</p>
            </div>
            <div className="bg-secondary/60 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-primary">{totalSets}</p>
              <p className="text-xs text-muted-foreground">Sets</p>
            </div>
            <div className="bg-secondary/60 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-primary">{Math.round(totalVolume)}</p>
              <p className="text-xs text-muted-foreground">Vol (kg)</p>
            </div>
          </div>

          {/* Exercise Details */}
          <div className="flex-1 overflow-y-auto space-y-4 -mx-6 px-6 pb-4">
            {log.exercises.map((exercise, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{exercise.exerciseName}</span>
                </div>
                
                <div className="pl-6">
                  <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-1 text-xs text-muted-foreground mb-1">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span>Info</span>
                  </div>
                  {exercise.sets.map((set, j) => {
                    const isChallenge = set.setType === 'challenge';
                    const hasTarget = isChallenge && typeof (set as any).targetReps === 'number';
                    const targetReps = (set as any).targetReps as number | undefined;
                    const isPartial = hasTarget && set.reps < targetReps!;
                    const isOver = hasTarget && set.reps > targetReps!;

                    return (
                      <div key={j} className="grid grid-cols-[40px_1fr_1fr_1fr] gap-1 text-sm py-1 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground">{j + 1}</span>
                        <span className="text-foreground font-medium">{set.weight} kg</span>
                        <span className={isPartial ? 'text-amber-400' : 'text-foreground'}>
                          {hasTarget
                            ? `${set.reps} / ${targetReps} reps${isOver ? ' ↑' : ''}`
                            : `${set.reps} reps`
                          }
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {set.intensity && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                              {INTENSITY_LABELS[set.intensity]}
                            </Badge>
                          )}
                          {set.setType && set.setType !== 'normal' && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                              {SET_TYPE_LABELS[set.setType]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <EditHistoryDialog
        log={log}
        open={showEdit}
        onOpenChange={setShowEdit}
        onSave={handleSaveEdit}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this workout from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
