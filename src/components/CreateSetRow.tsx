import { memo, useCallback } from 'react';
import { Plus, Minus, Trash2, ChevronDown, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  SetType,
  SET_TYPE_SHORT_LABELS,
  INTENSITY_LABELS,
  IntensityLevel,
} from '@/types/workout';

interface CreateSetRowProps {
  index: number;
  weight: number;
  setType: SetType;
  intensity: IntensityLevel;
  targetReps?: number;
  isOnlySet: boolean;
  onWeightChange: (weight: number) => void;
  onOpenIntensityPicker: () => void;
  onOpenSetTypePicker: () => void;
  onRemoveSet: () => void;
  onTargetRepsChange?: (reps: number) => void;
}

export const CreateSetRow = memo(function CreateSetRow({
  index,
  weight,
  setType,
  intensity,
  targetReps,
  isOnlySet,
  onWeightChange,
  onOpenIntensityPicker,
  onOpenSetTypePicker,
  onRemoveSet,
  onTargetRepsChange,
}: CreateSetRowProps) {
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

  const handleTargetRepsChange = useCallback((delta: number) => {
    onTargetRepsChange?.(Math.max(1, (targetReps || 30) + delta));
  }, [targetReps, onTargetRepsChange]);

  const handleTargetRepsInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTargetRepsChange?.(Math.max(1, Number(e.target.value)));
  }, [onTargetRepsChange]);

  if (isChallenge) {
    return (
      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
        {/* Top row: type selector + delete */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium text-primary gap-1"
            onClick={onOpenSetTypePicker}
          >
            <Target className="w-3.5 h-3.5" />
            Challenge Set
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemoveSet}
            disabled={isOnlySet}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Weight row */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground px-1">Weight (kg)</label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 text-foreground" onClick={handleWeightDecrement}>
              <Minus className="w-3 h-3" />
            </Button>
            <Input type="number" value={weight} onChange={handleWeightInput} className="h-9 text-center min-w-0 text-foreground bg-background" />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 text-foreground" onClick={handleWeightIncrement}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Target reps row */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground px-1">Total Rep Target</label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 text-foreground" onClick={() => handleTargetRepsChange(-5)}>
              <Minus className="w-3 h-3" />
            </Button>
            <Input type="number" value={targetReps || 30} onChange={handleTargetRepsInput} className="h-9 text-center min-w-0 text-foreground bg-background" />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 text-foreground" onClick={() => handleTargetRepsChange(5)}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Intensity row */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground px-1">Intensity</label>
          <Button variant="outline" size="sm" className="w-full h-9 text-sm text-foreground justify-center" onClick={onOpenIntensityPicker}>
            {intensity ? INTENSITY_LABELS[intensity] : '2 RIR'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[48px_1fr_64px_48px] gap-2 items-center p-2 bg-background/50 rounded-lg">
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
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-foreground" onClick={handleWeightDecrement}>
          <Minus className="w-3 h-3" />
        </Button>
        <Input type="number" value={weight} onChange={handleWeightInput} className="h-9 text-center min-w-0 text-foreground bg-background/80" />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-foreground" onClick={handleWeightIncrement}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Intensity */}
      <Button variant="outline" size="sm" className="h-9 text-xs px-1 text-foreground" onClick={onOpenIntensityPicker}>
        <span className="truncate">{intensity ? INTENSITY_LABELS[intensity] : '2 RIR'}</span>
      </Button>
      
      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onRemoveSet}
        disabled={isOnlySet}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
});
