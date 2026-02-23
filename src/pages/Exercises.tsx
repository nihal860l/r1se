import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ExerciseCard } from '@/components/ExerciseCard';
import { CreateExerciseDialog } from '@/components/CreateExerciseDialog';
import { Input } from '@/components/ui/input';
import { exercises } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { useExerciseSearch } from '@/lib/exerciseSearch';
import { Search } from 'lucide-react';

const Exercises = () => {
  const [search, setSearch] = useState('');
  const customExercises = useWorkoutStore((state) => state.customExercises);

  const allExercises = [...exercises, ...customExercises];
  const filteredExercises = useExerciseSearch(allExercises, search);

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-4 pb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Exercise Library</h2>
            <p className="text-sm text-muted-foreground">
              {allExercises.length} exercises available
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <CreateExerciseDialog />
          </div>
        </div>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or muscle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Exercise list */}
          <div className="space-y-2">
            {filteredExercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
            {filteredExercises.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No exercises found
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Exercises;
