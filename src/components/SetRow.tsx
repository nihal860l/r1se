import { memo, useCallback } from 'react';
import { Check, Plus, Minus, Trash2, ChevronDown, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  SetType,
  SET_TYPE_SHORT_LABELS,
  INTENSITY_LABELS,
  IntensityLevel,
} from '@/types/workout';

interface SetRowProps {
  index: number;
  weight: number;
  reps: number | null;
  intensity: IntensityLevel | null;
  setType: SetType;
  completed: boolean;
  isEditMode: boolean;
  isOnlySet: boolean;
  targetReps?: number;
  challengeAccumulatedReps?: number;
  onWeightChange: (weight: number) => void;
  onOpenRepsPicker: () => void;
  onOpenIntensityPicker: () => void;
  onOpenSetTypePicker: () => void;
  onToggleComplete: () => void;
  onRemoveSet: () => void;
}

export const SetRow = memo(function SetRow({
  index,
  weight,
  reps,
  intensity,
  setType,
  completed,
  isEditMode,
  isOnlySet,
  targetReps,
  challengeAccumulatedReps = 0,
  onWeightChange,
  onOpenRepsPicker,
  onOpenIntensityPicker,
  onOpenSetTypePicker,
  onToggleComplete,
  onRemoveSet,
}: SetRowProps) {
  const isNormal = setType === 'normal';
  const isChallenge = setType === 'challenge';

  const handleWeightDecrement = useCallback(() => {
    onWeightChange(Math.max(0, weight - 2.5));
  }, [weight, onWeightChange]);

  const handleWeightIncrement = useCallback(() => {
    onWeightChange(weight + 2.5);
  }, [weight, onWeightChange]);

  const handleWeightInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onWeightChange(Number(e.target.value));
  }, [onWeightChange]);

  // Challenge set view in classic mode
  if (isChallenge) {
    const target = targetReps || 30;
    const progressValue = Math.min(100, (challengeAccumulatedReps / target) * 100);
    const readyToComplete = challengeAccumulatedReps >= target;

    return (
      <div className={`p-3 rounded-lg transition-colors border ${
        completed ? 'bg-primary/10 border-primary/30' : readyToComplete ? 'bg-primary/5 border-primary/20' : 'bg-secondary/50 border-primary/10'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-1 text-xs font-medium text-primary"
              onClick={onOpenSetTypePicker}
            >
              <Target className="w-3.5 h-3.5 mr-1" />
              Challenge
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
            </Button>
            <span className="text-sm text-foreground font-medium">{weight}kg</span>
          </div>
          {isEditMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemoveSet}
              disabled={isOnlySet}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <Progress value={progressValue} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {challengeAccumulatedReps} / {target} reps
            </span>
            <span className={`font-semibold ${completed || readyToComplete ? 'text-primary' : 'text-foreground'}`}>
              {completed ? '✓ Complete' : readyToComplete ? '✓ Target reached' : `${target - challengeAccumulatedReps} remaining`}
            </span>
          </div>
          
          {!completed && !isEditMode && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-foreground"
                onClick={onOpenRepsPicker}
              >
                Log Reps
              </Button>
              <Button
                variant={readyToComplete ? 'default' : 'outline'}
                size="icon"
                className="h-9 w-9"
                onClick={onToggleComplete}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-[48px_1fr_56px_64px_40px] gap-1 items-center p-2 rounded-lg transition-colors ${
        completed ? 'bg-primary/10' : 'bg-secondary/50'
      }`}
    >
      {/* Set column */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 px-1 text-xs font-medium text-foreground ${!isNormal ? 'text-primary' : ''}`}
        onClick={onOpenSetTypePicker}
      >
        {isNormal ? (
          <span className="text-sm text-foreground">{index + 1}</span>
        ) : (
          <span className="truncate text-primary">{SET_TYPE_SHORT_LABELS[setType]}</span>
        )}
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-50 shrink-0" />
      </Button>
      
      {/* Weight */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-foreground" onClick={handleWeightDecrement}>
          <Minus className="w-3 h-3" />
        </Button>
        <Input type="number" value={weight} onChange={handleWeightInput} className="h-9 text-center min-w-0 text-foreground bg-background/50" />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-foreground" onClick={handleWeightIncrement}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Reps */}
      <Button variant="outline" size="sm" className="h-9 text-sm px-2 text-foreground" onClick={onOpenRepsPicker}>
        {reps !== null ? reps : '—'}
      </Button>
      
      {/* Intensity */}
      <Button variant="outline" size="sm" className="h-9 text-xs px-1 text-foreground" onClick={onOpenIntensityPicker}>
        <span className="truncate">{intensity ? INTENSITY_LABELS[intensity] : '—'}</span>
      </Button>
      
      {/* Actions */}
      <div className="flex items-center justify-end">
        {isEditMode ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={onRemoveSet}
            disabled={isOnlySet}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant={completed ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={onToggleComplete}
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
