import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Pause, ArrowLeftRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PausePreferenceDialog } from '@/components/PausePreferenceDialog';
import { Input } from '@/components/ui/input';
import { 
  IntensityLevel, 
  SetType,
  SET_TYPE_LABELS,
  INTENSITY_LABELS,
  CompletedSet,
  WorkoutExercise,
} from '@/types/workout';
import { exercises } from '@/data/exercises';
import { useExerciseSearch } from '@/lib/exerciseSearch';
import { useWorkoutStore } from '@/store/workoutStore';
import { useToast } from '@/hooks/use-toast';
import { useActiveSession, SessionSetLog } from '@/hooks/useActiveSession';
import { useCloudSession } from '@/hooks/useCloudSession';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Layout } from '@/components/Layout';
import { PickerDialog } from '@/components/PickerDialog';
import { SetRow } from '@/components/SetRow';
import { GuidedWorkoutView } from '@/components/GuidedWorkoutView';
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
import { InlineCreateExerciseDialog } from '@/components/InlineCreateExerciseDialog';
import { ExerciseMultiSelectSheet } from '@/components/ExerciseMultiSelectSheet';

interface SetLog {
  weight: number;
  reps: number | null;
  intensity: IntensityLevel | null;
  setType: SetType;
  completed: boolean;
  targetReps?: number;
  challengeAccumulatedReps?: number;
}

// Generate reps options
const REPS_OPTIONS = Array.from({ length: 101 }, (_, i) => i);
const CHALLENGE_REPS_OPTIONS = Array.from({ length: 201 }, (_, i) => i);
const INTENSITY_OPTIONS: IntensityLevel[] = ['warmup', '2rir', '1rir', 'failure'];
const SET_TYPE_OPTIONS: SetType[] = ['normal', 'superset', 'alternating', 'challenge'];

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();
  const [searchParams] = useSearchParams();
  const isResume = searchParams.get('resume') === 'true';
  
  const workouts = useWorkoutStore((state) => state.workouts);
  const addWorkoutLog = useWorkoutStore((state) => state.addWorkoutLog);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { toast } = useToast();
  const { session, startSession, updateSession, pauseSession, resumeSession, clearSession, getElapsed } = useActiveSession();
  const { saveSessionToCloud, clearCloudSession } = useCloudSession();

  const workout = workouts.find((w) => w.id === workoutId);
  const allExercises = [...exercises, ...customExercises];

  // Mode: 'guided' or 'classic'
  const [mode, setMode] = useState<'choose' | 'guided' | 'classic'>(() => {
    if (isResume && session && session.workoutId === workoutId) {
      return session.mode;
    }
    return 'choose';
  });

  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLog[]>>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [activeNoteExerciseId, setActiveNoteExerciseId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [restoredSession, setRestoredSession] = useState(false);
  const [showPausePref, setShowPausePref] = useState(false);
  const [pendingPauseAction, setPendingPauseAction] = useState<(() => void) | null>(null);
  
  const [repsPicker, setRepsPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [intensityPicker, setIntensityPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [setTypePicker, setSetTypePicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [challengeRepsPicker, setChallengeRepsPicker] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [showCreateExercise, setShowCreateExercise] = useState(false);

  // Captured picker values (FIX 1: avoid stale closures)
  const [currentPickerRepsValue, setCurrentPickerRepsValue] = useState(0);
  const [currentPickerIntensityValue, setCurrentPickerIntensityValue] = useState<IntensityLevel>('warmup');
  const [currentPickerSetTypeValue, setCurrentPickerSetTypeValue] = useState<SetType>('normal');
  const [currentChallengeRepsValue, setCurrentChallengeRepsValue] = useState(0);

  // Guided resume state for mode switching
  const [guidedResumeState, setGuidedResumeState] = useState<any>(undefined);
  const [guidedResumeElapsed, setGuidedResumeElapsed] = useState<number | undefined>(undefined);

  const filteredExercises = useExerciseSearch(allExercises, exerciseSearch);

  // Restore session for classic mode
  useEffect(() => {
    if (isResume && session && session.workoutId === workoutId && mode === 'classic' && !restoredSession) {
      setRestoredSession(true);
      if (session.exerciseLogs) {
        setExerciseLogs(session.exerciseLogs as Record<string, SetLog[]>);
      }
      if (session.workoutExercises) {
        setWorkoutExercises(session.workoutExercises);
      }
      const now = new Date();
      setStartTime(new Date(now.getTime() - session.elapsedBeforePause * 1000));
      setElapsed(session.elapsedBeforePause);
      resumeSession();
      return;
    }
  }, [isResume, session, workoutId, mode, restoredSession, resumeSession]);

  // Initialize workout for classic mode (new session)
  useEffect(() => {
    if (workout && mode === 'classic' && !isResume && !restoredSession) {
      const now = new Date();
      setStartTime(now);
      setWorkoutExercises([...workout.exercises]);
      
      const logs: Record<string, SetLog[]> = {};
      workout.exercises.forEach((we) => {
        logs[we.exerciseId] = we.sets.map((set) => ({
          weight: set.weight,
          reps: null,
          intensity: set.intensity || null,
          setType: set.setType || 'normal',
          completed: false,
          targetReps: set.targetReps,
          challengeAccumulatedReps: 0,
        }));
      });
      setExerciseLogs(logs);
      setIsEditMode(false);

      startSession({
        workoutId: workout.id,
        workoutName: workout.name,
        mode: 'classic',
        startedAt: now.getTime(),
        exerciseLogs: logs,
        workoutExercises: workout.exercises,
      });
    }
  }, [workout, mode, isResume, restoredSession]);

  // Timer
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Auto-save session state periodically for classic mode
  useEffect(() => {
    if (mode !== 'classic' || !startTime) return;
    const saveInterval = setInterval(() => {
      updateSession({
        exerciseLogs: exerciseLogs as any,
        workoutExercises,
      });
    }, 5000);
    return () => clearInterval(saveInterval);
  }, [mode, startTime, exerciseLogs, workoutExercises, updateSession]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSetLog = (
    exerciseId: string, 
    setIndex: number, 
    field: keyof SetLog, 
    value: number | string | boolean | null
  ) => {
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((set, i) =>
        i === setIndex ? { ...set, [field]: value } : set
      ),
    }));
  };

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    const currentSet = exerciseLogs[exerciseId][setIndex];
    
    // For challenge sets: just mark complete, save accumulated as reps
    if (currentSet.setType === 'challenge' && !currentSet.completed) {
      setExerciseLogs((prev) => ({
        ...prev,
        [exerciseId]: prev[exerciseId].map((set, i) =>
          i === setIndex 
            ? { ...set, completed: true, reps: set.challengeAccumulatedReps || 0 }
            : set
        ),
      }));
      return;
    }
    
    updateSetLog(exerciseId, setIndex, 'completed', !currentSet.completed);
  };

  // FIX 1: Remove duplicate exercise guard — allow duplicates
  const addExerciseToWorkout = (exerciseId: string) => {
    const newExercise: WorkoutExercise = {
      exerciseId,
      sets: [{ weight: 0, setType: 'normal', intensity: '2rir' }],
    };
    
    setWorkoutExercises((prev) => [...prev, newExercise]);
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] || []), { weight: 0, reps: null, intensity: '2rir' as IntensityLevel, setType: 'normal' as SetType, completed: false }],
    }));
    setShowAddExercise(false);
    setExerciseSearch('');
  };

  const handleInlineExerciseCreated = (exerciseId: string) => {
    addExerciseToWorkout(exerciseId);
    setShowCreateExercise(false);
  };

  const removeExercise = (exerciseId: string) => {
    setWorkoutExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
    setExerciseLogs((prev) => {
      const newLogs = { ...prev };
      delete newLogs[exerciseId];
      return newLogs;
    });
  };

  const addSetToExercise = (exerciseId: string) => {
    const lastSet = exerciseLogs[exerciseId]?.[exerciseLogs[exerciseId].length - 1];
    const newWeight = lastSet?.weight || 0;
    const newSetType = lastSet?.setType || 'normal';
    const newIntensity = lastSet?.intensity || '2rir';

    setWorkoutExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: [...e.sets, { weight: newWeight, setType: newSetType, intensity: newIntensity as IntensityLevel }] }
          : e
      )
    );
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: [...prev[exerciseId], { 
        weight: newWeight, 
        reps: null, 
        intensity: newIntensity as IntensityLevel, 
        setType: newSetType as SetType, 
        completed: false 
      }],
    }));
  };

  const removeSetFromExercise = (exerciseId: string, setIndex: number) => {
    setWorkoutExercises((prev) =>
      prev.map((e) =>
        e.exerciseId === exerciseId
          ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
          : e
      ).filter((e) => e.sets.length > 0)
    );
    setExerciseLogs((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].filter((_, i) => i !== setIndex),
    }));
  };

  const executePause = async () => {
    if (mode === 'classic') {
      pauseSession({
        exerciseLogs: exerciseLogs as any,
        workoutExercises,
      });
    }
    const currentSession = JSON.parse(localStorage.getItem('active-workout-session') || 'null');
    if (currentSession) {
      await saveSessionToCloud(currentSession);
    }
    toast({
      title: 'Workout paused',
      description: 'Progress saved to cloud. Resume from the home screen.',
    });
    navigate('/');
  };

  const handlePause = async () => {
    const promptShown = localStorage.getItem('pref-pause-prompt-shown');
    if (!promptShown) {
      setPendingPauseAction(() => executePause);
      setShowPausePref(true);
    } else {
      await executePause();
    }
  };

  const handlePauseChoice = (keepOvernight: boolean) => {
    localStorage.setItem('pref-keep-session-overnight', JSON.stringify(keepOvernight));
    localStorage.setItem('pref-pause-prompt-shown', JSON.stringify(true));
    setShowPausePref(false);
    pendingPauseAction?.();
    setPendingPauseAction(null);
  };

  const finishWorkout = () => {
    if (!workout || !startTime) return;

    const completedExercises = Object.entries(exerciseLogs)
      .filter(([, sets]) => sets.some((s) => s.completed))
      .map(([exerciseId, sets]) => {
        const exercise = allExercises.find((e) => e.id === exerciseId);
        return {
          exerciseId,
          exerciseName: exercise?.name || 'Unknown',
          sets: sets
            .filter((s) => s.completed)
            .map((s): CompletedSet => ({
              reps: s.setType === 'challenge' ? (s.challengeAccumulatedReps || s.reps || 0) : (s.reps || 0),
              weight: s.weight,
              intensity: s.intensity || undefined,
              setType: s.setType || undefined,
              targetReps: s.targetReps,
            })),
        };
      });

    addWorkoutLog({
      id: crypto.randomUUID(),
      workoutId: workout.id,
      workoutName: workout.name,
      completedAt: new Date(),
      duration: Math.floor(elapsed / 60),
      exercises: completedExercises,
    });

    clearSession();
    clearCloudSession();

    toast({
      title: 'Workout complete',
      description: `${workout.name} logged in ${formatTime(elapsed)}.`,
    });

    navigate('/');
  };

  // Guided mode completion handler
  const handleGuidedComplete = useCallback((
    completedExercises: { exerciseId: string; exerciseName: string; sets: CompletedSet[] }[],
    duration: number
  ) => {
    if (!workout) return;

    addWorkoutLog({
      id: crypto.randomUUID(),
      workoutId: workout.id,
      workoutName: workout.name,
      completedAt: new Date(),
      duration,
      exercises: completedExercises,
    });

    clearSession();
    clearCloudSession();

    toast({
      title: 'Workout complete',
      description: `${workout.name} has been saved to your history.`,
    });

    navigate('/');
  }, [workout, addWorkoutLog, toast, navigate, clearSession, clearCloudSession]);

  // Guided mode pause - actual execution
  const executeGuidedPause = useCallback(async (guidedState: any) => {
    pauseSession({
      guidedState,
    });
    setTimeout(async () => {
      const currentSession = JSON.parse(localStorage.getItem('active-workout-session') || 'null');
      if (currentSession) {
        await saveSessionToCloud(currentSession);
      }
      toast({
        title: 'Workout paused',
        description: 'Progress saved to cloud. Resume from the home screen.',
      });
      navigate('/');
    }, 50);
  }, [pauseSession, toast, navigate, saveSessionToCloud]);

  // Guided mode pause handler - with first-pause prompt
  const handleGuidedPause = useCallback(async (guidedState: any) => {
    const promptShown = localStorage.getItem('pref-pause-prompt-shown');
    if (!promptShown) {
      setPendingPauseAction(() => () => executeGuidedPause(guidedState));
      setShowPausePref(true);
    } else {
      await executeGuidedPause(guidedState);
    }
  }, [executeGuidedPause]);

  // FEATURE 1: Mode switching
  const handleSwitchToGuided = useCallback(() => {
    if (!workout) return;
    
    // Build completedSets from exerciseLogs
    const completedSetsMap: Record<string, CompletedSet[]> = {};
    let firstIncompleteIndex = 0;
    let setCounter = 0;
    let foundIncomplete = false;
    
    workoutExercises.forEach(we => {
      const sets = exerciseLogs[we.exerciseId] || [];
      const completed = sets.filter(s => s.completed).map(s => ({
        reps: s.setType === 'challenge' ? (s.challengeAccumulatedReps || s.reps || 0) : (s.reps || 0),
        weight: s.weight,
        intensity: s.intensity || undefined,
        setType: s.setType || undefined,
        targetReps: s.targetReps,
      }));
      if (completed.length > 0) {
        completedSetsMap[we.exerciseId] = completed;
      }
      sets.forEach(s => {
        if (!s.completed && !foundIncomplete) {
          firstIncompleteIndex = setCounter;
          foundIncomplete = true;
        }
        setCounter++;
      });
    });
    
    setGuidedResumeState({
      currentSetIndex: foundIncomplete ? firstIncompleteIndex : 0,
      phase: 'perform' as const,
      reps: 10,
      restSeconds: 90,
      challengeAccumulated: 0,
      challengeAttempt: 1,
      completedSets: completedSetsMap,
    });
    setGuidedResumeElapsed(elapsed);
    setMode('guided');
    updateSession({ mode: 'guided' });
    toast({ title: 'Switched to Guided mode' });
  }, [workout, workoutExercises, exerciseLogs, elapsed, updateSession, toast]);

  const handleSwitchToClassic = useCallback((guidedData: { completedSets: Record<string, CompletedSet[]> }) => {
    if (!workout) return;
    
    const logs: Record<string, SetLog[]> = {};
    const exs = workout.exercises;
    
    exs.forEach(we => {
      const completedForExercise = guidedData.completedSets[we.exerciseId] || [];
      logs[we.exerciseId] = we.sets.map((set, i) => {
        const completedSet = completedForExercise[i];
        return {
          weight: completedSet?.weight ?? set.weight,
          reps: completedSet?.reps ?? null,
          intensity: (completedSet?.intensity ?? set.intensity ?? null) as IntensityLevel | null,
          setType: (completedSet?.setType ?? set.setType ?? 'normal') as SetType,
          completed: !!completedSet,
          targetReps: set.targetReps,
          challengeAccumulatedReps: 0,
        };
      });
    });
    
    setExerciseLogs(logs);
    setWorkoutExercises([...exs]);
    if (!startTime) setStartTime(new Date());
    setMode('classic');
    setGuidedResumeState(undefined);
    setGuidedResumeElapsed(undefined);
    updateSession({ mode: 'classic', exerciseLogs: logs as any, workoutExercises: exs });
    toast({ title: 'Switched to Classic mode' });
  }, [workout, updateSession, toast, startTime]);

  const handleCancel = () => {
    if (mode === 'choose') {
      navigate('/');
      return;
    }
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    clearSession();
    clearCloudSession();
    navigate('/');
  };

  // Handle mode selection - start session for guided
  const handleSelectMode = (selectedMode: 'guided' | 'classic') => {
    if (selectedMode === 'guided' && workout) {
      startSession({
        workoutId: workout.id,
        workoutName: workout.name,
        mode: 'guided',
        startedAt: Date.now(),
      });
    }
    setMode(selectedMode);
  };

  // Picker open handlers — capture value at open time (FIX 1)
  const openRepsPicker = (exerciseId: string, setIndex: number) => {
    const set = exerciseLogs[exerciseId]?.[setIndex];
    if (set?.setType === 'challenge') {
      // Challenge sets use separate picker
      setCurrentChallengeRepsValue(0);
      setChallengeRepsPicker({ exerciseId, setIndex });
    } else {
      setCurrentPickerRepsValue(set?.reps ?? 0);
      setRepsPicker({ exerciseId, setIndex });
    }
  };

  const openIntensityPicker = (exerciseId: string, setIndex: number) => {
    const set = exerciseLogs[exerciseId]?.[setIndex];
    setCurrentPickerIntensityValue(set?.intensity ?? 'warmup');
    setIntensityPicker({ exerciseId, setIndex });
  };

  const openSetTypePicker = (exerciseId: string, setIndex: number) => {
    const set = exerciseLogs[exerciseId]?.[setIndex];
    setCurrentPickerSetTypeValue(set?.setType ?? 'normal');
    setSetTypePicker({ exerciseId, setIndex });
  };

  if (!workout) {
    return (
      <Layout hideNav>
        <div className="container max-w-lg px-4 py-8 text-center">
          <p className="text-muted-foreground">Workout not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  // ===== MODE CHOOSER =====
  if (mode === 'choose') {
    return (
      <Layout hideNav>
        <div className="container max-w-lg animate-fade-in px-4 flex flex-col items-center justify-center min-h-[calc(100vh-60px)] gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">{workout.name}</h2>
            <p className="text-muted-foreground mt-1">How do you want to train?</p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <Button
              onClick={() => handleSelectMode('guided')}
              className="w-full h-14 text-base"
            >
              Guided Mode
            </Button>
            <p className="text-xs text-muted-foreground text-center px-4">
              Step-by-step through each set with rest timers
            </p>

            <Button
              variant="outline"
              onClick={() => handleSelectMode('classic')}
              className="w-full h-14 text-base text-foreground"
            >
              Classic Mode
            </Button>
            <p className="text-xs text-muted-foreground text-center px-4">
              See all exercises at once, log freely
            </p>
          </div>

          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground mt-4">
            Cancel
          </Button>
        </div>
      </Layout>
    );
  }

  const resumeGuidedState = guidedResumeState || (isResume && session?.guidedState ? session.guidedState : undefined);
  const resumeElapsedTime = guidedResumeElapsed ?? (isResume && session ? session.elapsedBeforePause : undefined);

  // Shared cancel confirmation dialog
  const cancelDialog = (
    <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Workout?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this workout session? Your progress will not be saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Workout</AlertDialogCancel>
          <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Cancel Workout
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ===== GUIDED MODE =====
  if (mode === 'guided') {
    return (
      <Layout hideNav>
        <div className="container max-w-lg animate-fade-in px-4 flex flex-col min-h-[calc(100vh-60px)]">
          <GuidedWorkoutView
            workoutName={workout.name}
            workoutExercises={workout.exercises}
            allExercises={allExercises}
            onComplete={handleGuidedComplete}
            onCancel={handleCancel}
            onPause={handleGuidedPause}
            onSwitchToClassic={handleSwitchToClassic}
            resumeState={resumeGuidedState}
            resumeElapsed={resumeElapsedTime}
          />
        </div>
        {cancelDialog}
        <PausePreferenceDialog open={showPausePref} onChoice={handlePauseChoice} />
      </Layout>
    );
  }

  // ===== CLASSIC MODE =====
  return (
    <Layout hideNav>
      <div className="container max-w-lg animate-fade-in px-4 flex flex-col min-h-[calc(100vh-60px)]">
        {/* Header */}
        <div className="pt-4 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{workout.name}</h2>
              <p className="text-sm text-muted-foreground">Active workout session</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-primary">{formatTime(elapsed)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs h-8"
                onClick={handleSwitchToGuided}
                title="Switch to Guided mode"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                Guided
              </Button>
              <Button
                variant={isEditMode ? 'default' : 'outline'}
                size="sm"
                className="text-foreground"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Pencil className="w-4 h-4 mr-1" />
                {isEditMode ? 'Done' : 'Edit'}
              </Button>
              <Button variant="outline" size="icon" onClick={handlePause} className="text-foreground h-9 w-9" title="Pause workout">
                <Pause className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancel} className="text-foreground">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          {isEditMode && (
            <p className="text-sm text-muted-foreground mt-2">
              Edit mode: Add/remove exercises and sets, modify weights
            </p>
          )}
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 py-4">
            {workoutExercises.map((we) => {
              const exercise = allExercises.find((e) => e.id === we.exerciseId);
              if (!exercise) return null;
              const sets = exerciseLogs[we.exerciseId] || [];

              return (
                <div key={we.exerciseId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-wrap gap-y-1">
                      <h3 className="font-semibold text-foreground">{exercise.name}</h3>
                      {we.notes && (
                        <button
                          onClick={() => setActiveNoteExerciseId(activeNoteExerciseId === we.exerciseId ? null : we.exerciseId)}
                          className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-medium"
                        >
                          <Info className="w-3 h-3" />
                          Note
                        </button>
                      )}
                    </div>
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeExercise(we.exerciseId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {activeNoteExerciseId === we.exerciseId && we.notes && (
                    <p className="text-sm text-muted-foreground bg-card border border-border rounded-xl p-3">
                      {we.notes}
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[48px_1fr_56px_64px_40px] gap-1 text-xs text-muted-foreground px-1">
                      <span className="text-center text-muted-foreground">Set</span>
                      <span className="text-muted-foreground">Weight</span>
                      <span className="text-center text-muted-foreground">Reps</span>
                      <span className="text-center text-muted-foreground">Intensity</span>
                      <span></span>
                    </div>
                    
                    {sets.map((set, i) => (
                      <SetRow
                        key={i}
                        index={i}
                        weight={set.weight}
                        reps={set.reps}
                        intensity={set.intensity}
                        setType={set.setType || 'normal'}
                        completed={set.completed}
                        isEditMode={isEditMode}
                        isOnlySet={sets.length === 1}
                        targetReps={set.targetReps}
                        challengeAccumulatedReps={set.challengeAccumulatedReps}
                        onWeightChange={(weight) => updateSetLog(we.exerciseId, i, 'weight', weight)}
                        onOpenRepsPicker={() => openRepsPicker(we.exerciseId, i)}
                        onOpenIntensityPicker={() => openIntensityPicker(we.exerciseId, i)}
                        onOpenSetTypePicker={() => openSetTypePicker(we.exerciseId, i)}
                        onToggleComplete={() => toggleSetComplete(we.exerciseId, i)}
                        onRemoveSet={() => removeSetFromExercise(we.exerciseId, i)}
                      />
                    ))}
                    
                    {isEditMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-foreground/20 text-foreground"
                        onClick={() => addSetToExercise(we.exerciseId)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Set
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {isEditMode && (
              <Button
                variant="outline"
                className="w-full text-foreground"
                onClick={() => setShowAddExercise(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="py-4 border-t">
          <Button onClick={finishWorkout} className="w-full h-12 text-base">
            Finish Workout
          </Button>
        </div>
      </div>

      {/* Reps Picker Dialog */}
      <PickerDialog
        open={repsPicker !== null}
        onOpenChange={(open) => !open && setRepsPicker(null)}
        title="Select Reps"
        items={REPS_OPTIONS}
        value={currentPickerRepsValue}
        onConfirm={(value) => {
          if (repsPicker) {
            updateSetLog(repsPicker.exerciseId, repsPicker.setIndex, 'reps', value);
          }
        }}
      />

      {/* Challenge Reps Picker Dialog — accumulates */}
      <PickerDialog
        open={challengeRepsPicker !== null}
        onOpenChange={(open) => !open && setChallengeRepsPicker(null)}
        title="Reps This Attempt"
        items={CHALLENGE_REPS_OPTIONS}
        value={currentChallengeRepsValue}
        onConfirm={(value) => {
          if (challengeRepsPicker) {
            setExerciseLogs(prev => ({
              ...prev,
              [challengeRepsPicker.exerciseId]: prev[challengeRepsPicker.exerciseId].map((set, i) =>
                i === challengeRepsPicker.setIndex
                  ? { ...set, challengeAccumulatedReps: (set.challengeAccumulatedReps || 0) + value }
                  : set
              ),
            }));
          }
        }}
      />

      {/* Intensity Picker Dialog */}
      <PickerDialog
        open={intensityPicker !== null}
        onOpenChange={(open) => !open && setIntensityPicker(null)}
        title="Select Intensity"
        items={INTENSITY_OPTIONS}
        value={currentPickerIntensityValue}
        onConfirm={(value) => {
          if (intensityPicker) {
            updateSetLog(intensityPicker.exerciseId, intensityPicker.setIndex, 'intensity', value);
          }
        }}
        getLabel={(item) => INTENSITY_LABELS[item]}
      />

      {/* Set Type Picker Dialog */}
      <PickerDialog
        open={setTypePicker !== null}
        onOpenChange={(open) => !open && setSetTypePicker(null)}
        title="Select Set Type"
        items={SET_TYPE_OPTIONS}
        value={currentPickerSetTypeValue}
        onConfirm={(value) => {
          if (setTypePicker) {
            updateSetLog(setTypePicker.exerciseId, setTypePicker.setIndex, 'setType', value);
          }
        }}
        getLabel={(item) => SET_TYPE_LABELS[item]}
      />

      {/* Exercise Multi-Select Sheet */}
      <ExerciseMultiSelectSheet
        open={showAddExercise}
        onOpenChange={setShowAddExercise}
        existingExerciseIds={workoutExercises.map(we => we.exerciseId)}
        onAdd={(ids) => ids.forEach(id => addExerciseToWorkout(id))}
      />

      {/* Cancel Confirmation Dialog */}
      {cancelDialog}
      <PausePreferenceDialog open={showPausePref} onChoice={handlePauseChoice} />
    </Layout>
  );
}
