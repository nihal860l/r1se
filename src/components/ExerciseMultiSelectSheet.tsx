import { useState, useCallback } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { exercises } from '@/data/exercises';
import { useExerciseSearch } from '@/lib/exerciseSearch';
import { useWorkoutStore } from '@/store/workoutStore';
import { ExerciseCard } from './ExerciseCard';
import { InlineCreateExerciseDialog } from './InlineCreateExerciseDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExerciseMultiSelectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (exerciseIds: string[]) => void;
  existingExerciseIds?: string[];
}

export function ExerciseMultiSelectSheet({
  open,
  onOpenChange,
  onAdd,
  existingExerciseIds = [],
}: ExerciseMultiSelectSheetProps) {
  const [search, setSearch] = useState('');
  const [staged, setStaged] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const customExercises = useWorkoutStore((state) => state.customExercises);
  const allExercises = [...exercises, ...customExercises];
  const filtered = useExerciseSearch(allExercises, search);

  const handleAdd = useCallback(() => {
    if (staged.length === 0) return;
    onAdd(staged);
    setStaged([]);
    setSearch('');
    onOpenChange(false);
  }, [staged, onAdd, onOpenChange]);

  const addToStaged = useCallback((exerciseId: string) => {
    setStaged(prev => [...prev, exerciseId]);
  }, []);

  const removeFromStaged = useCallback((index: number) => {
    setStaged(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleExerciseCreated = useCallback((exerciseId: string) => {
    setStaged(prev => [...prev, exerciseId]);
    setShowCreate(false);
  }, []);

  // Reset when sheet opens
  const handleOpenChange = useCallback((o: boolean) => {
    if (o) {
      setStaged([]);
      setSearch('');
    }
    onOpenChange(o);
  }, [onOpenChange]);

  const exerciseCount = staged.length;
  const label = exerciseCount === 1 ? 'Add 1 Exercise' : `Add ${exerciseCount} Exercises`;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-foreground">Add Exercises</SheetTitle>
          </SheetHeader>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="space-y-2 pb-2">
              {filtered.map((ex) => {
                const isExisting = existingExerciseIds.includes(ex.id);
                return (
                  <div key={ex.id} className="relative">
                    <ExerciseCard
                      exercise={ex}
                      selected={false}
                      onClick={() => addToStaged(ex.id)}
                      showEdit={false}
                    />
                    {isExisting && (
                      <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        In workout
                      </span>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No exercises found</p>
              )}
            </div>

            {/* Create new exercise row — always last */}
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 p-3 mb-4 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">Create New Exercise</span>
            </button>
          </div>

          {/* Staging tray */}
          <div className="border-t bg-background px-4 pt-3">
            <div className="min-h-[44px] overflow-x-auto flex items-center gap-2 pb-2 scrollbar-hide">
              {staged.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tap exercises above to add them</p>
              ) : (
                staged.map((id, i) => {
                  const ex = allExercises.find(e => e.id === id);
                  return (
                    <div
                      key={`${id}-${i}`}
                      className="flex items-center gap-1.5 shrink-0 bg-primary/15 border border-primary/25 rounded-full px-3 py-1"
                    >
                      <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                        {ex?.name || 'Unknown'}
                      </span>
                      <button
                        onClick={() => removeFromStaged(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add button */}
            <Button
              onClick={handleAdd}
              disabled={staged.length === 0}
              className="w-full mb-4"
            >
              {staged.length === 0 ? 'Add Exercises' : label}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <InlineCreateExerciseDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onExerciseCreated={handleExerciseCreated}
      />
    </>
  );
}
