import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useWorkoutStore } from '@/store/workoutStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Dumbbell, Trash2, CalendarDays, List } from 'lucide-react';
import { format } from 'date-fns';
import { INTENSITY_LABELS, SET_TYPE_LABELS } from '@/types/workout';
import { useToast } from '@/hooks/use-toast';
import { useGlowStore } from '@/store/glowStore';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WorkoutHistoryCalendar } from '@/components/WorkoutHistoryCalendar';
import { WorkoutHistoryDetail } from '@/components/WorkoutHistoryDetail';
import { WorkoutLog } from '@/types/workout';

const History = () => {
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const deleteWorkoutLog = useWorkoutStore((state) => state.deleteWorkoutLog);
  const updateWorkoutLog = useWorkoutStore((state) => state.updateWorkoutLog);
  const { toast } = useToast();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);

  const handleDelete = (id: string) => {
    deleteWorkoutLog(id);
    setDeleteConfirm(null);
    toast({
      title: 'Deleted',
      description: 'Workout history entry has been removed.',
    });
  };

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">History</h2>
            <p className="text-sm text-muted-foreground">Your completed workouts</p>
          </div>
          {/* View Switcher */}
          <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {workoutLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg mb-1">No history yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Complete a workout to see it logged here.
            </p>
          </div>
        ) : viewMode === 'calendar' ? (
          <WorkoutHistoryCalendar workoutLogs={workoutLogs} onDelete={handleDelete} />
        ) : (
          <div className="space-y-3">
            {workoutLogs.map((log) => (
              <Card 
                key={log.id} 
                className={cn(
                  "relative cursor-pointer transition-all duration-300 hover:border-primary/25 hover:-translate-y-0.5",
                  glowEnabled && "hover:shadow-[0_0_20px_hsl(189_100%_51%/0.06)]"
                )}
                onClick={() => setSelectedLog(log)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(log.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                <CardHeader className="pb-2 pr-12">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-bold">{log.workoutName}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 rounded-lg">
                      <Clock className="w-3 h-3 mr-1" />
                      {log.duration} min
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(log.completedAt), 'EEEE, MMM d, yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {log.exercises.map((exercise, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Dumbbell className="w-3 h-3 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {exercise.exerciseName} · {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <WorkoutHistoryDetail
        log={selectedLog}
        open={selectedLog !== null}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        onDelete={handleDelete}
        onEdit={(log) => { updateWorkoutLog(log.id, log); setSelectedLog(null); }}
      />

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this workout from your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default History;
