import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useWorkoutStore } from '@/store/workoutStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Calendar, BedDouble, Dumbbell, Eye, RotateCcw, PlayCircle, CheckCircle2, BookOpen, Clock } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { exercises } from '@/data/exercises';
import { useActiveSession } from '@/hooks/useActiveSession';
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
import { useState } from 'react';

const Today = () => {
  const navigate = useNavigate();
  const getTodayAssignment = useWorkoutStore((state) => state.getTodayAssignment);
  const workouts = useWorkoutStore((state) => state.workouts);
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { session, clearSession } = useActiveSession();
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  
  const todayAssignment = getTodayAssignment();
  const today = new Date();
  const formattedDate = format(today, 'EEE, MMM d');
  
  const workout = todayAssignment.workoutId 
    ? workouts.find((w) => w.id === todayAssignment.workoutId)
    : null;
  
  const allExercises = [...exercises, ...customExercises];
  
  const exerciseNames = workout?.exercises
    .map((we) => allExercises.find((e) => e.id === we.exerciseId)?.name)
    .filter(Boolean)
    .slice(0, 3) || [];

  // Check if today's scheduled workout has been completed
  const todayCompleted = todayAssignment.type === 'Workout' && todayAssignment.workoutId
    ? workoutLogs.some((log) => {
        const logDate = new Date(log.completedAt);
        return isToday(logDate) && log.workoutId === todayAssignment.workoutId;
      })
    : false;

  const handleStartWorkout = () => {
    if (workout) {
      navigate(`/workout/${workout.id}`);
    }
  };

  const handleViewWorkout = () => {
    if (workout) {
      navigate(`/create-workout?edit=${workout.id}`);
    }
  };

  const handleResume = () => {
    if (session) {
      navigate(`/workout/${session.workoutId}?resume=true`);
    }
  };

  const handleRestart = () => {
    if (session) {
      clearSession();
      navigate(`/workout/${session.workoutId}`);
    } else if (workout) {
      navigate(`/workout/${workout.id}`);
    }
    setShowRestartConfirm(false);
  };

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-4 pb-6">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {/* Active Session Card */}
          {session ? (
            <Card className="w-full bg-card border-primary/30 border-2">
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 animate-pulse">
                  <Dumbbell className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold text-center text-primary">Workout In Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{session.workoutName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {session.mode === 'guided' ? '🎯 Guided Mode' : '📋 Classic Mode'} · Paused
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    size="lg" 
                    className="w-full gap-2"
                    onClick={handleResume}
                  >
                    <PlayCircle className="w-5 h-5" />
                    RESUME WORKOUT
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full gap-2 text-foreground"
                    onClick={() => setShowRestartConfirm(true)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    RESTART WORKOUT
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : todayCompleted && workout ? (
            // Workout Completed Card
            <Card className="w-full bg-card border-border">
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-center">Today's Workout Complete</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center text-muted-foreground">
                  Great work finishing <span className="font-medium text-foreground">{workout.name}</span>!
                </p>

                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => navigate('/workouts')}
                  >
                    <BookOpen className="w-5 h-5" />
                    WORKOUT LIBRARY
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate('/history')}
                  >
                    <Clock className="w-4 h-4" />
                    WORKOUT HISTORY
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-foreground"
                    onClick={() => setShowRestartConfirm(true)}
                  >
                    <RotateCcw className="w-4 h-4" />
                    RESTART WORKOUT
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : todayAssignment.type === 'Rest' ? (
            // Rest Day Card
            <Card className="w-full bg-card border-border text-center">
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <BedDouble className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">REST & RECOVER</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  No training today. Stretch & recover.
                </p>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => navigate('/workout-plan')}
                >
                  <Calendar className="w-4 h-4" />
                  View Plan
                </Button>
              </CardContent>
            </Card>
          ) : todayAssignment.type === 'Workout' && workout ? (
            // Workout Day Card
            <Card className="w-full bg-card border-border">
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Dumbbell className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-center">{workout.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    {exerciseNames.join(' • ')}
                    {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {workout.exercises.length} exercises
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    size="lg" 
                    className="w-full gap-2"
                    onClick={handleStartWorkout}
                  >
                    <Play className="w-5 h-5" />
                    START WORKOUT
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleViewWorkout}
                  >
                    <Eye className="w-4 h-4" />
                    VIEW WORKOUT
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Empty / No Plan Card
            <Card className="w-full bg-card border-border text-center">
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl font-semibold">No workout scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  size="lg" 
                  className="gap-2"
                  onClick={() => navigate('/workout-plan')}
                >
                  Plan now
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Restart Confirmation */}
      <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restart this workout? This will start the workout again from the beginning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Today;
