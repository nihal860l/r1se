import { Layout } from '@/components/Layout';
import { useWorkoutStore } from '@/store/workoutStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { INTENSITY_LABELS, SET_TYPE_LABELS } from '@/types/workout';

const History = () => {
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-4 pb-4">
          <h2 className="text-xl font-semibold">History</h2>
          <p className="text-sm text-muted-foreground">Your completed workouts</p>
        </div>

        <div className="space-y-3">
          {workoutLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-1">No history yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Complete a workout to see it logged here.
              </p>
            </div>
          ) : (
            workoutLogs.map((log) => (
              <Card key={log.id} className="bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">{log.workoutName}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {log.duration} min
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(log.completedAt), 'EEEE, MMM d, yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {log.exercises.map((exercise, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{exercise.exerciseName}</span>
                        </div>
                        <div className="pl-6 space-y-1">
                          {exercise.sets.map((set, j) => (
                            <div 
                              key={j} 
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <span className="w-12">Set {j + 1}</span>
                              <span className="w-16">{set.weight}kg</span>
                              <span className="w-12">{set.reps} reps</span>
                              {set.intensity && (
                                <Badge variant="outline" className="text-xs h-5">
                                  {INTENSITY_LABELS[set.intensity]}
                                </Badge>
                              )}
                              {set.setType && set.setType !== 'normal' && (
                                <Badge variant="secondary" className="text-xs h-5">
                                  {SET_TYPE_LABELS[set.setType]}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default History;
