import { Moon, Sun } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PausePreferenceDialogProps {
  open: boolean;
  onChoice: (keepOvernight: boolean) => void;
}

export function PausePreferenceDialog({ open, onChoice }: PausePreferenceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>What happens to paused workouts?</DialogTitle>
          <DialogDescription>
            If you close the app mid-workout, should your paused session still be waiting for you the next day?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => onChoice(true)}
            className="w-full text-left p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Yes, keep it</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your paused workout stays available until you finish or cancel it
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onChoice(false)}
            className="w-full text-left p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-semibold text-foreground">No, move on</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically log what you completed and clear the session at midnight
                </p>
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
