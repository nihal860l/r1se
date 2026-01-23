import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { exercises, categoryLabels } from '@/data/exercises';
import { Exercise } from '@/types/workout';
import { Search } from 'lucide-react';

const categories = Object.keys(categoryLabels) as Exercise['category'][];

const Exercises = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Exercise['category'] | null>(null);

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(search.toLowerCase()) ||
      exercise.muscleGroup.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in">
        <PageHeader 
          title="Exercise Library" 
          subtitle="Browse all available exercises"
        />

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
