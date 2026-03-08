import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Timer, ChevronRight, Trophy, Minus, Plus, SkipForward, X } from 'lucide-react';
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
  const [animKey, setAnimKey] = useState(0); // for transition animations
  const restIntervalRef = useRef<ReturnType<typeof setInterval>>();

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

  // Rest countdown - using ref-based interval for reliability
  useEffect(() => {
    if (phase !== 'rest') {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      return;
    }
    restIntervalRef.current = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [phase]);

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

  // Rest timer progress (for circular indicator)
  const restProgress = phase === 'rest'
    ? ((DEFAULT_REST_SECONDS - restSeconds) / DEFAULT_REST_SECONDS) * 100
    : 0;

  const handleFinishSet = useCallback(() => {
    if (!currentSet) return;

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

    if (currentSetIndex >= totalSets - 1) {
      setPhase('complete');
      setAnimKey((k) => k + 1);
    } else {
      setPhase('rest');
      setRestSeconds(DEFAULT_REST_SECONDS);
      setAnimKey((k) => k + 1);
    }
  }, [currentSet, currentSetIndex, totalSets, reps]);

  const handleSkipSet = useCallback(() => {
    if (currentSetIndex >= totalSets - 1) {
      setPhase('complete');
      setAnimKey((k) => k + 1);
    } else {
      setCurrentSetIndex((prev) => prev + 1);
      setReps(10);
      setAnimKey((k) => k + 1);
    }
  }, [currentSetIndex, totalSets]);

  const handleNextSet = useCallback(() => {
    setCurrentSetIndex((prev) => prev + 1);
    setReps(10);
    setPhase('perform');
    setAnimKey((k) => k + 1);
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
      (sum, sets) => sum + sets.length, 0
    );
    const totalVolume = Object.values(completedSets).reduce(
      (sum, sets) => sum + sets.reduce((s, set) => s + set.weight * set.reps, 0), 0
    );
    const exerciseCount = Object.keys(completedSets).length;

    return (
      <div key={animKey} className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
          <Trophy className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Workout Complete!</h2>
        <p className="text-muted-foreground text-center text-lg">
          Great job finishing <span className="text-foreground font-semibold">{workoutName}</span>
        </p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-2">
          <div className="bg-secondary/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{formatTime(elapsed)}</p>
            <p className="text-xs text-muted-foreground mt-1">Duration</p>
          </div>
          <div className="bg-secondary/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalCompletedSets}</p>
            <p className="text-xs text-muted-foreground mt-1">Sets</p>
          </div>
          <div className="bg-secondary/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{exerciseCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Exercises</p>
          </div>
          <div className="bg-secondary/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{Math.round(totalVolume)}</p>
            <p className="text-xs text-muted-foreground mt-1">Volume (kg)</p>
          </div>
        </div>

        <Button onClick={handleCompleteWorkout} className="w-full max-w-xs h-14 text-lg mt-4">
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
      <div key={animKey} className="flex flex-col items-center justify-center min-h-[70vh] gap-5 px-4 animate-fade-in">
        <Progress value={progress} className="w-full max-w-xs h-2" />
        <p className="text-sm text-muted-foreground font-medium">
          ✓ Set {currentSetIndex + 1} of {totalSets} done
        </p>

        {/* Rest timer circle */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              className="stroke-secondary"
              strokeWidth="6"
            />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              className="stroke-primary transition-all duration-1000 ease-linear"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - restProgress / 100)}`}
            />
          </svg>
          <div className="text-center z-10">
            {restDone ? (
              <p className="text-2xl font-bold text-primary animate-pulse">GO!</p>
            ) : (
              <>
                <p className="text-4xl font-mono font-bold text-foreground tabular-nums">
                  {formatTime(restSeconds)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Rest</p>
              </>
            )}
          </div>
        </div>

        {/* Adjust rest */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setRestSeconds((prev) => Math.max(0, prev - 15))}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-10 text-center tabular-nums font-mono">
            {restDone ? '0s' : `${restSeconds}s`}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setRestSeconds((prev) => prev + 15)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Up next preview */}
        {nextSet && (
          <div className="bg-secondary/50 rounded-xl px-6 py-3 text-center w-full max-w-xs">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Up next</p>
            <p className="text-foreground font-semibold mt-1">
              {isNewExerciseNext ? nextSet.exerciseName : `Set ${nextSet.setIndex + 1}`}
            </p>
            {nextSet.weight > 0 && (
              <p className="text-sm text-muted-foreground">{nextSet.weight} kg</p>
            )}
          </div>
        )}

        <Button
          onClick={handleNextSet}
          className="w-full max-w-xs h-14 text-lg mt-auto"
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
    <div key={animKey} className="flex flex-col items-center min-h-[70vh] gap-3 px-4 animate-fade-in">
      {/* Progress */}
      <Progress value={progress} className="w-full max-w-xs h-2 mt-4" />
      <div className="flex items-center justify-between w-full max-w-xs">
        <p className="text-sm text-muted-foreground">
          Set {currentSetIndex + 1} of {totalSets}
        </p>
        <p className="text-sm text-muted-foreground font-mono tabular-nums">
          {formatTime(elapsed)}
        </p>
      </div>

      {/* Exercise info */}
      <div className="text-center mt-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Exercise {currentSet.exerciseIndex + 1}
        </p>
        <h2 className="text-2xl font-bold text-foreground mt-1">{currentSet.exerciseName}</h2>
        <p className="text-muted-foreground mt-1">
          Set {currentSet.setIndex + 1} of {currentSet.totalSetsForExercise}
        </p>
      </div>

      {/* Target info cards */}
      <div className="flex gap-4 mt-4">
        {currentSet.weight > 0 && (
          <div className="bg-secondary/60 rounded-xl px-6 py-3 text-center">
            <p className="text-3xl font-bold text-foreground">{currentSet.weight}</p>
            <p className="text-xs text-muted-foreground">kg</p>
          </div>
        )}
        {currentSet.intensity && (
          <div className="bg-primary/10 rounded-xl px-6 py-3 text-center">
            <p className="text-lg font-semibold text-primary">
              {INTENSITY_LABELS[currentSet.intensity]}
            </p>
            <p className="text-xs text-muted-foreground">Target</p>
          </div>
        )}
      </div>

      {/* Reps input - large and central */}
      <div className="flex flex-col items-center gap-2 mt-8">
        <p className="text-sm text-muted-foreground font-medium">Reps completed</p>
        <div className="flex items-center gap-5">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full text-foreground"
            onClick={() => setReps((prev) => Math.max(0, prev - 1))}
          >
            <Minus className="w-6 h-6" />
          </Button>
          <span className="text-6xl font-bold text-foreground w-24 text-center tabular-nums">
            {reps}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full text-foreground"
            onClick={() => setReps((prev) => prev + 1)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-xs mt-auto pb-6 space-y-3">
        <Button onClick={handleFinishSet} className="w-full h-14 text-lg">
          {currentSetIndex >= totalSets - 1 ? '🏁 Finish Last Set' : '✅ Done — Rest'}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1 text-muted-foreground"
            onClick={handleSkipSet}
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip Set
          </Button>
          <Button
            variant="ghost"
            className="flex-1 text-muted-foreground"
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
