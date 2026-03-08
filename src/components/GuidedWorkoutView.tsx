import { useState, useEffect, useCallback, useMemo } from 'react';
import { Timer, ChevronRight, Trophy, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  WorkoutExercise,
  CompletedSet,
  INTENSITY_LABELS,
  IntensityLevel,
} from '@/types/workout';
import { Exercise } from '@/types/workout';

interface GuidedWorkoutViewProps {
  workoutName: string;
  workoutExercises: WorkoutExercise[];
  allExercises: Exercise[];
  onComplete: (completedExercises: {
    exerciseId: string;
    exerciseName: string;
    sets: CompletedSet[];
  }[], duration: number) => void;
  onCancel: () => void;
}

type Phase = 'perform' | 'rest' | 'complete';

const DEFAULT_REST_SECONDS = 90;

interface FlatSet {
  exerciseIndex: number;
  setIndex: number;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  intensity?: IntensityLevel;
  totalSetsForExercise: number;
}

export function GuidedWorkoutView({
  workoutName,
  workoutExercises,
  allExercises,
  onComplete,
  onCancel,
}: GuidedWorkoutViewProps) {
  // Flatten all sets into a linear sequence
  const flatSets = useMemo<FlatSet[]>(() => {
    const sets: FlatSet[] = [];
    workoutExercises.forEach((we, exerciseIndex) => {
      const exercise = allExercises.find((e) => e.id === we.exerciseId);
      const name = exercise?.name || 'Unknown Exercise';
      we.sets.forEach((set, setIndex) => {
        sets.push({
          exerciseIndex,
          setIndex,
          exerciseId: we.exerciseId,
          exerciseName: name,
          weight: set.weight,
          intensity: set.intensity,
          totalSetsForExercise: we.sets.length,
        });
      });
    });
    return sets;
  }, [workoutExercises, allExercises]);

  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('perform');
  const [reps, setReps] = useState(10);
  const [restSeconds, setRestSeconds] = useState(DEFAULT_REST_SECONDS);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Completed sets log
  const [completedSets, setCompletedSets] = useState<
    Record<string, CompletedSet[]>
  >({});

  // Workout timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Rest countdown
  useEffect(() => {
    if (phase !== 'rest') return;
    if (restSeconds <= 0) return;
    const interval = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, restSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSet = flatSets[currentSetIndex];
  const totalSets = flatSets.length;
  const progress = phase === 'complete'
    ? 100
    : ((currentSetIndex) / totalSets) * 100;

  const handleFinishSet = useCallback(() => {
    if (!currentSet) return;

    // Record completed set
    setCompletedSets((prev) => ({
      ...prev,
      [currentSet.exerciseId]: [
        ...(prev[currentSet.exerciseId] || []),
        {
          reps,
          weight: currentSet.weight,
          intensity: currentSet.intensity,
        },
      ],
    }));

    // Check if this was the last set
    if (currentSetIndex >= totalSets - 1) {
      setPhase('complete');
    } else {
      setPhase('rest');
      setRestSeconds(DEFAULT_REST_SECONDS);
    }
  }, [currentSet, currentSetIndex, totalSets, reps]);

  const handleNextSet = useCallback(() => {
    setCurrentSetIndex((prev) => prev + 1);
    setReps(10);
    setPhase('perform');
  }, []);

  const handleCompleteWorkout = useCallback(() => {
    const exercises = Object.entries(completedSets).map(([exerciseId, sets]) => {
      const exercise = allExercises.find((e) => e.id === exerciseId);
      return {
        exerciseId,
        exerciseName: exercise?.name || 'Unknown',
        sets,
      };
    });
    const duration = Math.floor(elapsed / 60);
    onComplete(exercises, duration);
  }, [completedSets, allExercises, elapsed, onComplete]);

  // Determine if next set is a different exercise
  const isNewExerciseNext = currentSetIndex < totalSets - 1
    && flatSets[currentSetIndex + 1]?.exerciseId !== currentSet?.exerciseId;

  if (totalSets === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">This workout has no sets configured.</p>
        <Button onClick={onCancel}>Go Back</Button>
      </div>
    );
  }

  // ===== COMPLETION SCREEN =====
  if (phase === 'complete') {
    const totalCompletedSets = Object.values(completedSets).reduce(
      (sum, sets) => sum + sets.length,
      0
    );
    const totalVolume = Object.values(completedSets).reduce(
      (sum, sets) => sum + sets.reduce((s, set) => s + set.weight * set.reps, 0),
      0
    );

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Workout Complete!</h2>
        <p className="text-muted-foreground text-center">
          Great job finishing <span className="text-foreground font-medium">{workoutName}</span>
        </p>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{formatTime(elapsed)}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totalCompletedSets}</p>
            <p className="text-xs text-muted-foreground">Sets</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{Math.round(totalVolume)}</p>
            <p className="text-xs text-muted-foreground">Volume (kg)</p>
          </div>
        </div>
        <Button onClick={handleCompleteWorkout} className="w-full max-w-xs h-12 text-base mt-4">
          Save & Finish
        </Button>
      </div>
    );
  }

  // ===== REST SCREEN =====
  if (phase === 'rest') {
    const nextSet = flatSets[currentSetIndex + 1];
    const restDone = restSeconds <= 0;

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 animate-fade-in">
        <Progress value={progress} className="w-full max-w-xs h-2" />
        <p className="text-sm text-muted-foreground">
          Set {currentSetIndex + 1} of {totalSets} completed
        </p>

        <div className="w-36 h-36 rounded-full border-4 border-primary/30 flex items-center justify-center relative">
          {restDone ? (
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">Ready!</p>
            </div>
          ) : (
            <div className="text-center">
              <Timer className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-3xl font-mono font-bold text-foreground">{formatTime(restSeconds)}</p>
              <p className="text-xs text-muted-foreground">Rest</p>
            </div>
          )}
        </div>

        {/* Adjust rest time */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setRestSeconds((prev) => Math.max(0, prev - 15))}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {restDone ? '0s' : `${restSeconds}s`}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setRestSeconds((prev) => prev + 15)}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {nextSet && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Up next</p>
            <p className="text-foreground font-medium">
              {isNewExerciseNext ? nextSet.exerciseName : `Set ${nextSet.setIndex + 1}`}
              {nextSet.weight > 0 && ` • ${nextSet.weight} kg`}
            </p>
          </div>
        )}

        <Button
          onClick={handleNextSet}
          className="w-full max-w-xs h-12 text-base"
          variant={restDone ? 'default' : 'outline'}
        >
          {restDone ? 'Start Next Set' : 'Skip Rest'}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    );
  }

  // ===== PERFORM SET SCREEN =====
  return (
    <div className="flex flex-col items-center min-h-[70vh] gap-4 px-4 animate-fade-in">
      <Progress value={progress} className="w-full max-w-xs h-2 mt-2" />
      <p className="text-sm text-muted-foreground">
        Set {currentSetIndex + 1} of {totalSets}
      </p>

      {/* Exercise info */}
      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-foreground">{currentSet.exerciseName}</h2>
        <p className="text-muted-foreground mt-1">
          Set {currentSet.setIndex + 1} of {currentSet.totalSetsForExercise}
        </p>
      </div>

      {/* Target info */}
      <div className="flex gap-6 mt-2">
        {currentSet.weight > 0 && (
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">{currentSet.weight}</p>
            <p className="text-xs text-muted-foreground">kg</p>
          </div>
        )}
        {currentSet.intensity && (
          <div className="text-center">
            <p className="text-lg font-semibold text-primary">
              {INTENSITY_LABELS[currentSet.intensity]}
            </p>
            <p className="text-xs text-muted-foreground">Target</p>
          </div>
        )}
      </div>

      {/* Reps input */}
      <div className="flex flex-col items-center gap-3 mt-6">
        <p className="text-sm text-muted-foreground">Reps completed</p>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setReps((prev) => Math.max(0, prev - 1))}
          >
            <Minus className="w-5 h-5" />
          </Button>
          <span className="text-5xl font-bold text-foreground w-20 text-center tabular-nums">
            {reps}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setReps((prev) => prev + 1)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Timer */}
      <p className="text-sm text-muted-foreground font-mono mt-4">
        {formatTime(elapsed)}
      </p>

      {/* Action buttons */}
      <div className="w-full max-w-xs mt-auto pb-6 space-y-3">
        <Button onClick={handleFinishSet} className="w-full h-14 text-lg">
          {currentSetIndex >= totalSets - 1 ? 'Finish Last Set' : 'Done — Rest'}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full text-muted-foreground">
          Cancel Workout
        </Button>
      </div>
    </div>
  );
}
