import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useWorkoutStore } from '@/store/workoutStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Calendar, BedDouble, Dumbbell, Eye, RotateCcw, PlayCircle, CheckCircle2, BookOpen, Clock, ChevronRight, Camera, TrendingUp, Flame, ArrowUp, ArrowDown } from 'lucide-react';
import { format, isToday, differenceInDays, startOfWeek } from 'date-fns';
import { exercises } from '@/data/exercises';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useCloudSession } from '@/hooks/useCloudSession';
import { useGlowStore } from '@/store/glowStore';
import { useAppMode } from '@/hooks/useAppMode';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { useCoachingRelationship } from '@/hooks/useCoachingRelationship';
import { useCoachClients } from '@/hooks/useCoachClients';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
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
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const h = 20;
  const w = 40;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className={className} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const Today = () => {
  const navigate = useNavigate();
  const getTodayAssignment = useWorkoutStore((state) => state.getTodayAssignment);
  const getActivePlan = useWorkoutStore((state) => state.getActivePlan);
  const workouts = useWorkoutStore((state) => state.workouts);
  const workoutLogs = useWorkoutStore((state) => state.workoutLogs);
  const customExercises = useWorkoutStore((state) => state.customExercises);
  const { session, clearSession, startSession } = useActiveSession();
  const { loadSessionFromCloud, clearCloudSession } = useCloudSession();
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const { mode } = useAppMode();
  const { measurementTypes, logs: measurementLogs, getLogsForType, getTopImprovements } = useBodyMetrics();
  const { photos, uploadPhoto, getTodayPhoto } = useProgressPhotos();
  const { relationship, coachProfile: myCoach, unreadCount } = useCoachingRelationship();
  const { activeClients } = useCoachClients();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Check-in state
  const [checkInSubmitted, setCheckInSubmitted] = useState(false);
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const [showCheckInSheet, setShowCheckInSheet] = useState(false);
  const [checkInData, setCheckInData] = useState({ trainingFeel: 0, energy: 0, sleep: 0, sorenessNote: '', otherNote: '' });
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // PR detection state
  const [newPRs, setNewPRs] = useState<{ name: string; old: number; new: number }[]>([]);
  const [showPRSheet, setShowPRSheet] = useState(false);
  const prevLogCount = useRef(workoutLogs.length);

  useEffect(() => {
    if (!session) {
      loadSessionFromCloud().then((cloudSession) => {
        if (cloudSession) {
          localStorage.setItem('active-workout-session', JSON.stringify(cloudSession));
          window.dispatchEvent(new Event('storage'));
          navigate('/', { replace: true });
        }
      });
    }
  }, []);

  const activePlan = getActivePlan();
  const todayAssignment = getTodayAssignment();
  const today = new Date();
  const formattedDate = format(today, 'EEE, MMM d').toUpperCase();

  const workout = todayAssignment.workoutId
    ? workouts.find((w) => w.id === todayAssignment.workoutId)
    : null;

  const allExercises = [...exercises, ...customExercises];
  const exerciseNames = workout?.exercises
    .map((we) => allExercises.find((e) => e.id === we.exerciseId)?.name)
    .filter(Boolean)
    .slice(0, 3) || [];

  const todayCompleted = todayAssignment.type === 'Workout' && todayAssignment.workoutId
    ? workoutLogs.some((log) => {
        const logDate = new Date(log.completedAt);
        return isToday(logDate) && log.workoutId === todayAssignment.workoutId;
      })
    : false;

  // Streak calculation
  const streak = useMemo(() => {
    if (!workoutLogs.length) return 0;
    const sorted = [...workoutLogs].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const dates = [...new Set(sorted.map(l => format(new Date(l.completedAt), 'yyyy-MM-dd')))];
    let count = 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let checkDate = todayStr;
    for (const d of dates) {
      if (d === checkDate) {
        count++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = format(prev, 'yyyy-MM-dd');
      } else if (d < checkDate) {
        break;
      }
    }
    return count;
  }, [workoutLogs]);

  // Progress snapshot data
  const bodyWeightType = measurementTypes.find(t => t.name.toLowerCase() === 'body weight');
  const bodyWeightLogs = bodyWeightType ? getLogsForType(bodyWeightType.id) : [];
  const topImprovements = getTopImprovements().slice(0, 2);
  const todayPhoto = getTodayPhoto();

  const hasProgressData = measurementLogs.length > 0 || workoutLogs.length > 0;

  // Check-in due logic
  const checkInDue = useMemo(() => {
    if (mode !== 'client' || !relationship) return false;
    const today = new Date().getDay();
    const checkInDay = relationship.check_in_day ?? 0;
    return today >= checkInDay;
  }, [mode, relationship]);

  const handleSubmitCheckIn = async () => {
    if (!relationship) return;
    setSubmittingCheckIn(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('check_ins').upsert({
        coach_client_id: relationship.id,
        client_id: relationship.client_id,
        week_start_date: weekStart,
        training_feel: checkInData.trainingFeel,
        energy_level: checkInData.energy,
        sleep_quality: checkInData.sleep,
        soreness_note: checkInData.sorenessNote || null,
        other_note: checkInData.otherNote || null,
      });
      setCheckInSubmitted(true);
      setShowCheckInSheet(false);
      toast.success('Check-in sent to your coach!');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  // PR detection effect
  useEffect(() => {
    if (workoutLogs.length <= prevLogCount.current) {
      prevLogCount.current = workoutLogs.length;
      return;
    }
    prevLogCount.current = workoutLogs.length;
    const latest = workoutLogs[0];
    if (!latest) return;
    const prs: { name: string; old: number; new: number }[] = [];
    const estimate1RM = (w: number, r: number) => r <= 0 || w <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30);
    latest.exercises.forEach(ex => {
      const exName = allExercises.find(e => e.id === ex.exerciseId)?.name || 'Unknown';
      const latestBest = Math.max(...ex.sets.map(s => estimate1RM(s.weight, s.reps || 0)));
      const previous = workoutLogs.slice(1)
        .flatMap(l => l.exercises.filter(e => e.exerciseId === ex.exerciseId))
        .flatMap(e => e.sets)
        .reduce((best, s) => Math.max(best, estimate1RM(s.weight, s.reps || 0)), 0);
      if (latestBest > previous && previous > 0) {
        prs.push({ name: exName, old: Math.round(previous * 10) / 10, new: Math.round(latestBest * 10) / 10 });
      }
    });
    if (prs.length > 0) {
      setNewPRs(prs);
      setShowPRSheet(true);
      setTimeout(() => setShowPRSheet(false), 5000);
    }
  }, [workoutLogs.length]);

  const handleStartWorkout = () => { if (workout) navigate(`/workout/${workout.id}`); };
  const handleViewWorkout = () => { if (workout) navigate(`/create-workout?edit=${workout.id}`); };
  const handleResume = () => { if (session) navigate(`/workout/${session.workoutId}?resume=true`); };
  const handleRestart = () => {
    if (session) { clearSession(); clearCloudSession(); navigate(`/workout/${session.workoutId}`); }
    else if (workout) navigate(`/workout/${workout.id}`);
    setShowRestartConfirm(false);
  };

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadPhoto(file);
    setUploading(false);
  }, [uploadPhoto]);

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        {/* Date + Greeting */}
        <div className="pt-6 pb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">{formattedDate}</p>
          <h1 className="text-2xl font-bold mt-1">{getGreeting()}</h1>
        </div>

        {/* Client Mode: Coach Card */}
        {mode === 'client' && relationship && myCoach && (
          <Card className={cn("mb-4 bg-gradient-to-br from-card to-primary/5 border-primary/20", glowEnabled && "card-glow")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {myCoach.avatar_url ? (
                    <img src={myCoach.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{(myCoach.display_name || '?')[0]}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">{myCoach.display_name}</p>
                      {myCoach.is_verified && <span className="text-primary text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">Your Coach</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/messages')} className="relative">
                  💬
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Plan */}
        {activePlan && (
          <button
            onClick={() => navigate('/workout-plan')}
            className={cn(
              "w-full mb-4 p-4 rounded-xl border bg-card inner-glow transition-all duration-300 text-left group",
              glowEnabled ? "border-primary/20 hover:border-primary/40" : "border-border hover:border-primary/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Current Plan</p>
                <p className="text-lg font-bold text-foreground">{activePlan.name}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        )}

        {/* Workout Card */}
        <div className="flex flex-col items-center">
          {session ? (
            <Card className={cn("w-full border-2 border-primary/30", glowEnabled && "card-glow")}>
              <CardHeader className="pb-4">
                <div className={cn("mx-auto w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 animate-pulse")}>
                  <Dumbbell className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold text-center text-primary">Workout In Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{session.workoutName}</p>
                  <p className="text-sm text-muted-foreground mt-1">{session.mode === 'guided' ? 'Guided Mode' : 'Classic Mode'} - Paused</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button size="lg" glow={glowEnabled} className="w-full gap-2 h-12" onClick={handleResume}>
                    <PlayCircle className="w-5 h-5" /> RESUME WORKOUT
                  </Button>
                  <Button variant="outline" className="w-full gap-2 text-foreground h-12" onClick={() => setShowRestartConfirm(true)}>
                    <RotateCcw className="w-4 h-4" /> RESTART WORKOUT
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : todayCompleted && workout ? (
            <Card className={cn("w-full", glowEnabled && "card-glow border-glow")}>
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-center">Today's Workout Complete</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center text-muted-foreground">Great work finishing <span className="font-semibold text-foreground">{workout.name}</span>!</p>
                <div className="flex flex-col gap-3">
                  <Button size="lg" glow={glowEnabled} className="w-full gap-2 h-12" onClick={() => navigate('/workouts')}>
                    <BookOpen className="w-5 h-5" /> WORKOUT LIBRARY
                  </Button>
                  <Button variant="outline" className="w-full gap-2 h-12" onClick={() => navigate('/history')}>
                    <Clock className="w-4 h-4" /> WORKOUT HISTORY
                  </Button>
                  <Button variant="outline" className="w-full gap-2 text-foreground h-12" onClick={() => setShowRestartConfirm(true)}>
                    <RotateCcw className="w-4 h-4" /> RESTART WORKOUT
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : todayAssignment.type === 'Rest' ? (
            <Card className={cn("w-full text-center", glowEnabled && "card-glow border-glow")}>
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                  <BedDouble className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">REST & RECOVER</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">No training today. Stretch & recover.</p>
                <Button variant="outline" className="gap-2" onClick={() => navigate('/workout-plan')}>
                  <Calendar className="w-4 h-4" /> View Plan
                </Button>
              </CardContent>
            </Card>
          ) : todayAssignment.type === 'Workout' && workout ? (
            <Card className={cn("w-full", glowEnabled && "card-glow border-glow")}>
              <CardHeader className="pb-4">
                <div className={cn("mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4")}>
                  <Dumbbell className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-center tracking-tight">{workout.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    {exerciseNames.join(' · ')}{workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
                  </p>
                  <p className="text-xs text-muted-foreground">{workout.exercises.length} exercises</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button size="lg" glow={glowEnabled} className="w-full gap-2 h-12" onClick={handleStartWorkout}>
                    <Play className="w-5 h-5" /> START WORKOUT
                  </Button>
                  <Button variant="outline" className="w-full gap-2 h-12" onClick={handleViewWorkout}>
                    <Eye className="w-4 h-4" /> VIEW WORKOUT
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={cn("w-full text-center", glowEnabled && "card-glow border-glow")}>
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl font-bold">No workout scheduled</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Train Smart, R1SE Harder</p>
                <Button size="lg" glow={glowEnabled} className="gap-2 h-12" onClick={() => navigate('/workout-plan')}>
                  Plan now
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coach Mode: Client Activity Strip */}
        {mode === 'coach' && activeClients.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-2">Client Activity</p>
            <div className="overflow-x-auto scrollbar-none">
              <div className="flex gap-3 pb-1" style={{ width: 'max-content' }}>
                {activeClients.map(client => {
                  const activityColor = 'bg-amber-500';
                  return (
                    <button
                      key={client.id}
                      onClick={() => navigate('/coach')}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="relative">
                        {client.client_profile?.avatar_url ? (
                          <img src={client.client_profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border" loading="lazy" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
                            <span className="text-sm font-bold text-muted-foreground">
                              {(client.client_profile?.display_name || '?')[0]}
                            </span>
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${activityColor}`} />
                      </div>
                      <p className="text-[9px] text-muted-foreground max-w-[48px] truncate text-center">
                        {client.client_profile?.display_name?.split(' ')[0] || 'Client'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {hasProgressData && (
          <div className="mt-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-2.5 pb-2" style={{ minWidth: 'min-content' }}>
              {/* Body weight chip */}
              {bodyWeightType && bodyWeightLogs.length > 0 && (
                <div className="bg-card border border-border rounded-2xl px-4 py-3 shrink-0 flex items-center gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Weight</p>
                    <p className="text-sm font-bold">{Number(bodyWeightLogs[bodyWeightLogs.length - 1].value).toFixed(1)} {bodyWeightType.unit}</p>
                  </div>
                  <MiniSparkline values={bodyWeightLogs.slice(-7).map(l => Number(l.value))} />
                  {bodyWeightLogs.length > 1 && (
                    <span className="text-[10px] text-muted-foreground">
                      {Number(bodyWeightLogs[bodyWeightLogs.length - 1].value) > Number(bodyWeightLogs[bodyWeightLogs.length - 2].value) ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              )}

              {/* Top improving measurements */}
              {topImprovements.map(imp => (
                <div key={imp.typeId} className="bg-card border border-border rounded-2xl px-4 py-3 shrink-0">
                  <p className="text-[10px] text-muted-foreground">{imp.typeName}</p>
                  <p className="text-sm font-bold">{imp.currentValue} {imp.unit}</p>
                  <p className={cn("text-[10px] font-semibold", "text-primary")}>
                    {imp.changeAbsolute > 0 ? '+' : ''}{imp.changeAbsolute} {imp.unit}
                  </p>
                </div>
              ))}

              {/* Streak chip */}
              {streak > 0 && (
                <div className="bg-card border border-border rounded-2xl px-4 py-3 shrink-0">
                  <p className="text-sm font-bold">🔥 {streak} day streak</p>
                </div>
              )}

              {/* No data chip */}
              {!bodyWeightType && topImprovements.length === 0 && streak === 0 && (
                <button onClick={() => navigate('/progress')} className="bg-card border border-border rounded-2xl px-4 py-3 shrink-0 text-left">
                  <p className="text-sm text-muted-foreground">Track your first measurement →</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Photo Card */}
        <Card className={cn("mt-4 mb-4", glowEnabled && "card-glow")} onClick={() => !todayPhoto && fileInputRef.current?.click()}>
          <CardContent className="p-4 flex items-center gap-4 cursor-pointer">
            <div className="w-16 h-16 rounded-xl bg-secondary shrink-0 overflow-hidden flex items-center justify-center">
              {photos.length > 0 && photos[0].thumbnailUrl ? (
                <img src={photos[0].thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {todayPhoto ? (
                <p className="text-primary font-semibold text-sm">Progress photo logged ✓</p>
              ) : (
                <>
                  <p className="font-semibold text-sm">Add Today's Progress Photo</p>
                  <p className="text-xs text-muted-foreground">Consistency builds the picture.</p>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] shrink-0" onClick={(e) => { e.stopPropagation(); navigate('/progress'); }}>
              All Photos
            </Button>
          </CardContent>
        </Card>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />

        {/* Client Mode: Check-In Prompt */}
        {mode === 'client' && relationship && checkInDue && !checkInSubmitted && (
          <Card
            className={cn("mt-4 border-primary/30 cursor-pointer", glowEnabled && "card-glow")}
            onClick={() => setShowCheckInSheet(true)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Weekly Check-In Due 📋</p>
                <p className="text-xs text-muted-foreground mt-0.5">30 seconds. Your coach is waiting.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        )}
        {mode === 'client' && relationship && checkInSubmitted && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-primary font-medium text-center">Check-in sent ✓</p>
          </div>
        )}

        {/* Normal Mode: Coaching Upsell */}
        {mode === 'normal' && !relationship && (
          <Card className={cn("mt-4 mb-4", glowEnabled && "card-glow border-glow")}>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-lg">Training alone is good. Training with the right coach is different.</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The coaches on R1SE don't hand you a generic PDF and disappear. They build your program around your goals, watch your progress, and adjust when life gets in the way. That's what actually moves the needle.
              </p>
              <Button glow={glowEnabled} className="w-full" onClick={() => navigate('/marketplace')}>
                Find Your Coach
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">Or keep training your way. We're just here when you're ready.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Check-In Sheet */}
      <Sheet open={showCheckInSheet} onOpenChange={setShowCheckInSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>This Week with {myCoach?.display_name || 'Your Coach'}</SheetTitle>
            <p className="text-sm text-muted-foreground">30 seconds. Honest answers. Your coach actually reads these.</p>
          </SheetHeader>
          <div className="space-y-6 pb-6">
            <div>
              <p className="text-sm font-medium mb-2">How did training feel overall?</p>
              <div className="flex gap-3 justify-between">
                {['😩','😕','😐','💪','🔥'].map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => setCheckInData(d => ({ ...d, trainingFeel: i + 1 }))}
                    className={cn("text-2xl p-2 rounded-xl transition-all", checkInData.trainingFeel === i + 1 ? "bg-primary/20 scale-110" : "bg-secondary")}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Energy levels this week?</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setCheckInData(d => ({ ...d, energy: n }))}
                    className={cn("w-10 h-10 rounded-full border-2 transition-all", n <= checkInData.energy ? "bg-primary border-primary" : "border-border bg-secondary")}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Sleep quality?</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setCheckInData(d => ({ ...d, sleep: n }))}
                    className={cn("w-10 h-10 rounded-full border-2 transition-all", n <= checkInData.sleep ? "bg-primary border-primary" : "border-border bg-secondary")}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Any soreness, pain, or things to flag?</p>
              <textarea
                value={checkInData.sorenessNote}
                onChange={e => setCheckInData(d => ({ ...d, sorenessNote: e.target.value }))}
                placeholder="Nothing to report / Left knee felt off..."
                className="w-full bg-secondary border border-border rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Message for your coach? <span className="text-muted-foreground font-normal">(optional)</span></p>
              <textarea
                value={checkInData.otherNote}
                onChange={e => setCheckInData(d => ({ ...d, otherNote: e.target.value }))}
                placeholder="Anything else you want them to know..."
                className="w-full bg-secondary border border-border rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:border-primary/50"
              />
            </div>
            <Button
              className="w-full"
              glow={glowEnabled}
              disabled={submittingCheckIn || (checkInData.trainingFeel === 0 && checkInData.energy === 0 && checkInData.sleep === 0)}
              onClick={handleSubmitCheckIn}
            >
              {submittingCheckIn ? 'Sending...' : 'Send Check-In'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* PR Sheet */}
      <Sheet open={showPRSheet} onOpenChange={setShowPRSheet}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>New Personal Best 🔥</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {newPRs.map((pr, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20">
                <p className="font-semibold text-sm">{pr.name}</p>
                <p className="text-sm text-primary font-bold">{pr.old} → {pr.new} kg</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showRestartConfirm} onOpenChange={setShowRestartConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Workout?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to restart this workout? This will start the workout again from the beginning.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Restart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Today;
