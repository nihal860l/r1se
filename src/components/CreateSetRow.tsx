import { memo, useCallback } from 'react';
import { Plus, Minus, Trash2, ChevronDown } from 'lucide-react';
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

  const handleTargetRepsInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTargetRepsChange?.(Math.max(1, Number(e.target.value)));
  }, [onTargetRepsChange]);

  if (isChallenge) {
    return (
      <div className="grid grid-cols-[48px_1fr_80px_48px] gap-2 items-center p-2 bg-primary/5 rounded-lg border border-primary/20">
        {/* Set type indicator */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-1 text-xs font-medium text-primary"
          onClick={onOpenSetTypePicker}
        >
          <span className="truncate text-primary">{SET_TYPE_SHORT_LABELS[setType]}</span>
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

        {/* Target reps */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={targetReps || 30}
            onChange={handleTargetRepsInput}
            className="h-9 text-center min-w-0 text-foreground bg-background/80 text-sm"
            placeholder="Reps"
          />
        </div>

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
  }

  return (
    <div className="grid grid-cols-[48px_1fr_64px_48px] gap-2 items-center p-2 bg-background/50 rounded-lg">
      {/* Set column - integrated with type */}
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
