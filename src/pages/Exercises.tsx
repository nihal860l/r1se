import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ExerciseCard } from '@/components/ExerciseCard';
import { CreateExerciseDialog } from '@/components/CreateExerciseDialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { exercises, categoryLabels } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { Exercise } from '@/types/workout';
import { Search } from 'lucide-react';

const categories = Object.keys(categoryLabels) as Exercise['category'][];

const Exercises = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Exercise['category'] | null>(null);
  const customExercises = useWorkoutStore((state) => state.customExercises);

  const allExercises = [...exercises, ...customExercises];

  const filteredExercises = allExercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(search.toLowerCase()) ||
      exercise.muscleGroup.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-4 pb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Exercise Library</h2>
            <p className="text-sm text-muted-foreground">Browse all available exercises</p>
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
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            <Badge
              variant={selectedCategory === null ? 'default' : 'secondary'}
              className="cursor-pointer shrink-0"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'secondary'}
                className="cursor-pointer shrink-0 capitalize"
                onClick={() => setSelectedCategory(category)}
              >
                {categoryLabels[category]}
              </Badge>
            ))}
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
