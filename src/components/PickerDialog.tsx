import { useState, useEffect, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NativePicker } from './NativePicker';

interface PickerDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: T[];
  value: T;
  onConfirm: (value: T) => void;
  getLabel?: (item: T) => string;
}

function PickerDialogComponent<T>({
  open,
  onOpenChange,
  title,
  items,
  value,
  onConfirm,
  getLabel = (item) => String(item),
}: PickerDialogProps<T>) {
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    if (open) {
      setTempValue(value);
    }
  }, [open, value]);

  const handleConfirm = () => {
    onConfirm(tempValue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-3">
          <NativePicker
            items={items}
            value={tempValue}
            onChange={setTempValue}
            getLabel={getLabel}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const PickerDialog = memo(PickerDialogComponent) as typeof PickerDialogComponent;
