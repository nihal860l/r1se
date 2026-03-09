import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useWorkoutStore } from '@/store/workoutStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, ChevronDown, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { exercises as defaultExercises } from '@/data/exercises';
import { Input } from '@/components/ui/input';
import { useGlowStore } from '@/store/glowStore';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CHART_COLORS = [
  'hsl(142, 76%, 46%)',
  'hsl(200, 80%, 55%)',
  'hsl(45, 90%, 55%)',
  'hsl(330, 70%, 55%)',
  'hsl(270, 60%, 60%)',
];

interface DataPoint {
  date: string;
  dateLabel: string;
  [key: string]: number | string;
}

const Progress = () => {
  const workoutLogs = useWorkoutStore((s) => s.workoutLogs);
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [metric, setMetric] = useState<'estimated1rm' | 'volume'>('estimated1rm');

  const exerciseMap = useMemo(() => {
    const map = new Map<string, string>();
    defaultExercises.forEach((e) => map.set(e.id, e.name));
    customExercises.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [customExercises]);

  const exercisesInHistory = useMemo(() => {
    const ids = new Set<string>();
    workoutLogs.forEach((log) => {
      log.exercises.forEach((ex) => ids.add(ex.exerciseId));
    });
    return Array.from(ids)
      .map((id) => ({ id, name: exerciseMap.get(id) || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workoutLogs, exerciseMap]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercisesInHistory;
    const q = searchQuery.toLowerCase();
    return exercisesInHistory.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercisesInHistory, searchQuery]);

  const estimated1RM = (weight: number, reps: number) => {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  };

  const chartData = useMemo(() => {
    if (selectedExerciseIds.length === 0) return [];
    const exerciseDateMap = new Map<string, Map<string, { best1rm: number; totalVolume: number }>>();
    selectedExerciseIds.forEach((exId) => {
      exerciseDateMap.set(exId, new Map());
    });
    workoutLogs
      .slice()
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .forEach((log) => {
        const dateKey = format(new Date(log.completedAt), 'yyyy-MM-dd');
        log.exercises.forEach((ex) => {
          if (!selectedExerciseIds.includes(ex.exerciseId)) return;
          const map = exerciseDateMap.get(ex.exerciseId)!;
          const existing = map.get(dateKey) || { best1rm: 0, totalVolume: 0 };
          ex.sets.forEach((set) => {
            const w = set.weight || 0;
            const r = set.reps || 0;
            const e1rm = estimated1RM(w, r);
            if (e1rm > existing.best1rm) existing.best1rm = e1rm;
            existing.totalVolume += w * r;
          });
          map.set(dateKey, existing);
        });
      });
    const allDates = new Set<string>();
    exerciseDateMap.forEach((dateMap) => {
      dateMap.forEach((_, d) => allDates.add(d));
    });
    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map((date) => {
      const point: DataPoint = {
        date,
        dateLabel: format(new Date(date), 'MMM d'),
      };
      selectedExerciseIds.forEach((exId) => {
        const dateMap = exerciseDateMap.get(exId)!;
        const data = dateMap.get(date);
        const name = exerciseMap.get(exId) || exId;
        if (metric === 'estimated1rm') {
          point[name] = data ? Math.round(data.best1rm * 10) / 10 : 0;
        } else {
          point[name] = data ? data.totalVolume : 0;
        }
      });
      return point;
    }).filter((point) => {
      return selectedExerciseIds.some((exId) => {
        const name = exerciseMap.get(exId) || exId;
        return (point[name] as number) > 0;
      });
    });
  }, [workoutLogs, selectedExerciseIds, exerciseMap, metric]);

  const toggleExercise = (id: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const removeExercise = (id: string) => {
    setSelectedExerciseIds((prev) => prev.filter((e) => e !== id));
  };

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-6 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Progress</h2>
          <p className="text-sm text-muted-foreground">Track your strength over time</p>
        </div>

        {/* Exercise Selection */}
        <div className="space-y-3 mb-4">
          <Button
            variant="outline"
            className="w-full justify-between h-11"
            onClick={() => setShowPicker(!showPicker)}
          >
            <span className="text-foreground">
              {selectedExerciseIds.length === 0
                ? 'Select exercises to track...'
                : `${selectedExerciseIds.length} exercise${selectedExerciseIds.length > 1 ? 's' : ''} selected`}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
          </Button>

          {showPicker && (
            <Card className={cn(glowEnabled && "card-glow border-glow")}>
              <CardContent className="p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredExercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No exercises found in your history
                    </p>
                  ) : (
                    filteredExercises.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => toggleExercise(ex.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          selectedExerciseIds.includes(ex.id)
                            ? 'bg-primary/15 text-primary font-medium'
                            : 'hover:bg-muted text-foreground'
                        )}
                      >
                        {ex.name}
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedExerciseIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedExerciseIds.map((id, i) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="gap-1 pr-1 rounded-lg"
                  style={{ borderColor: CHART_COLORS[i % CHART_COLORS.length], borderWidth: 1 }}
                >
                  <span className="text-xs">{exerciseMap.get(id) || id}</span>
                  <button
                    onClick={() => removeExercise(id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Metric Toggle */}
        {selectedExerciseIds.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={metric === 'estimated1rm' ? 'default' : 'outline'}
              onClick={() => setMetric('estimated1rm')}
              className="text-xs rounded-lg"
            >
              Est. 1RM
            </Button>
            <Button
              size="sm"
              variant={metric === 'volume' ? 'default' : 'outline'}
              onClick={() => setMetric('volume')}
              className="text-xs rounded-lg"
            >
              Volume
            </Button>
          </div>
        )}

        {/* Chart */}
        {selectedExerciseIds.length > 0 ? (
          chartData.length > 0 ? (
            <Card className={cn(glowEnabled && "card-glow border-glow")}>
              <CardContent className="p-3 pt-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      label={{
                        value: metric === 'estimated1rm' ? 'Est. 1RM (kg)' : 'Volume (kg×reps)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 15,
                        style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: 12,
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    {selectedExerciseIds.length > 1 && (
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                    {selectedExerciseIds.map((exId, i) => {
                      const name = exerciseMap.get(exId) || exId;
                      return (
                        <Line
                          key={exId}
                          type="monotone"
                          dataKey={name}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                          connectNulls={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className={cn(glowEnabled && "card-glow border-glow")}>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No history data found for the selected exercises
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          <Card className={cn(glowEnabled && "card-glow border-glow")}>
            <CardContent className="py-16 text-center">
              <div className={cn(
                "w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4",
                glowEnabled && "shadow-[0_0_20px_hsl(142_76%_46%/0.15)]"
              )}>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <p className="text-foreground font-bold mb-1">Track Your Progress</p>
              <p className="text-sm text-muted-foreground">
                Select exercises above to see your strength progression over time
              </p>
            </CardContent>
          </Card>
        )}

        {selectedExerciseIds.length > 0 && chartData.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3 mb-6">
            {metric === 'estimated1rm'
              ? 'Estimated 1RM calculated using the Epley formula: weight × (1 + reps/30)'
              : 'Volume = total weight × reps per session'}
          </p>
        )}
      </div>
    </Layout>
  );
};

export default Progress;
