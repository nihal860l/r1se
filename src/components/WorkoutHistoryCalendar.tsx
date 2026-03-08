import { useMemo, useState } from 'react';
import { WorkoutLog } from '@/types/workout';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Dumbbell, Clock } from 'lucide-react';
import { WorkoutHistoryDetail } from './WorkoutHistoryDetail';
import { useWorkoutStore } from '@/store/workoutStore';

interface WorkoutHistoryCalendarProps {
  workoutLogs: WorkoutLog[];
  onDelete: (id: string) => void;
}

export function WorkoutHistoryCalendar({ workoutLogs, onDelete }: WorkoutHistoryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const updateWorkoutLog = useWorkoutStore((state) => state.updateWorkoutLog);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const logsByDate = useMemo(() => {
    const map: Record<string, WorkoutLog[]> = {};
    workoutLogs.forEach(log => {
      const key = format(new Date(log.completedAt), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(log);
    });
    return map;
  }, [workoutLogs]);

  // Only show days that have workouts for a cleaner view
  const daysWithWorkouts = useMemo(() => {
    return daysInMonth
      .map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const logs = logsByDate[dateKey] || [];
        if (logs.length === 0) return null;
        return {
          date: day,
          dateKey,
          dayOfWeek: format(day, 'EEE'),
          dayNumber: format(day, 'd'),
          logs,
        };
      })
      .filter(Boolean) as { date: Date; dateKey: string; dayOfWeek: string; dayNumber: string; logs: WorkoutLog[] }[];
  }, [daysInMonth, logsByDate]);

  const totalWorkoutsThisMonth = daysWithWorkouts.reduce((sum, d) => sum + d.logs.length, 0);

  return (
    <div className="space-y-4 pb-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="text-foreground" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          {totalWorkoutsThisMonth > 0 && (
            <p className="text-xs text-muted-foreground">
              {totalWorkoutsThisMonth} workout{totalWorkoutsThisMonth !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="text-foreground" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Days with workouts */}
      {daysWithWorkouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">No workouts this month</p>
        </div>
      ) : (
        <div className="space-y-3">
          {daysWithWorkouts.map(({ date, dateKey, dayOfWeek, dayNumber, logs }) => {
            const isToday = isSameDay(date, new Date());

            return (
              <div key={dateKey}>
                {/* Day Header */}
                <div className={`flex items-center gap-3 py-2 px-1`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isToday 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-foreground'
                  }`}>
                    {dayNumber}
                  </div>
                  <span className={`text-xs font-medium uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {dayOfWeek}
                  </span>
                </div>

                {/* Workout Cards for this day */}
                <div className="pl-13 ml-5 border-l-2 border-border pl-4 space-y-2 pb-2">
                  {logs.map(log => (
                    <Card 
                      key={log.id} 
                      className="bg-card cursor-pointer hover:bg-accent/10 transition-colors border-border"
                      onClick={() => setSelectedLog(log)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">{log.workoutName}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {log.duration}m
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 pl-6">
                          {log.exercises.length} exercise{log.exercises.length !== 1 ? 's' : ''} · {log.exercises.reduce((sum, e) => sum + e.sets.length, 0)} sets
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <WorkoutHistoryDetail
        log={selectedLog}
        open={selectedLog !== null}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        onDelete={onDelete}
        onEdit={(log) => { updateWorkoutLog(log.id, log); setSelectedLog(null); }}
      />
    </div>
  );
}
