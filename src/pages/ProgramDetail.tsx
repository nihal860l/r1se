import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/hooks/useAuth';
import { useWorkoutStore } from '@/store/workoutStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Award, Users, Calendar, Dumbbell, Star, ChevronDown, ChevronRight, Flag, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useGlowStore } from '@/store/glowStore';
import { toast } from 'sonner';
import type { Program, ProgramWeek } from '@/hooks/usePrograms';
import { DEFAULT_WEEKLY_ASSIGNMENTS } from '@/types/workout';

export default function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { followProgram, trackView } = useMarketplace();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const addWorkout = useWorkoutStore((s) => s.addWorkout);
  const workouts = useWorkoutStore((s) => s.workouts);

  const [program, setProgram] = useState<(Program & { coach_name?: string; coach_avatar?: string; coach_verified?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [alreadyFollowed, setAlreadyFollowed] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);
  const [followCount, setFollowCount] = useState(0);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    if (!programId) return;
    fetchProgram();
    trackView(programId);
  }, [programId]);

  const fetchProgram = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('program_id', programId)
        .eq('status', 'published')
        .single();
      if (error) throw error;

      // Coach info
      const { data: coach } = await supabase
        .from('coach_profiles')
        .select('display_name, avatar_url, is_verified')
        .eq('user_id', data.coach_id)
        .single();

      // Follow count
      const { count } = await supabase
        .from('program_follows')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', programId);

      // Check if user follows
      if (user) {
        const { data: existingFollow } = await supabase
          .from('program_follows')
          .select('id')
          .eq('user_id', user.id)
          .eq('program_id', programId)
          .maybeSingle();
        setAlreadyFollowed(!!existingFollow);
      }

      setFollowCount(count || 0);
      setProgram({
        id: data.id,
        program_id: data.program_id,
        coach_id: data.coach_id,
        title: data.title,
        short_description: data.short_description,
        long_description: data.long_description,
        banner_image_url: data.banner_image_url,
        category_tags: data.category_tags || [],
        difficulty: data.difficulty,
        equipment_tags: data.equipment_tags || [],
        price_amount: data.price_amount,
        currency: data.currency,
        visibility: data.visibility,
        preview_weeks: data.preview_weeks || 0,
        status: data.status,
        version_number: data.version_number,
        manifest: Array.isArray(data.manifest) ? data.manifest as any : [],
        days_per_week: data.days_per_week,
        total_weeks: data.total_weeks,
        promo_video_url: data.promo_video_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
        published_at: data.published_at,
        coach_name: coach?.display_name,
        coach_avatar: coach?.avatar_url,
        coach_verified: coach?.is_verified,
      });
    } catch (err) {
      console.error('Error fetching program:', err);
      toast.error('Program not found');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!program || !user) return;

    if (program.visibility === 'paid') {
      toast.info('Paid programs coming soon. Purchase flow is not yet active.');
      return;
    }

    setFollowing(true);
    try {
      const res = await followProgram(program.program_id, program.version_number, program.manifest);
      if (res.error) {
        toast.error(res.error.message || 'Failed to follow');
        return;
      }
      setAlreadyFollowed(true);
      setFollowCount(c => c + 1);
      setShowImportDialog(true);
      toast.success('Program followed!');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setFollowing(false);
    }
  };

  const handleImportWorkouts = () => {
    if (!program) return;
    const manifest = program.manifest as ProgramWeek[];
    let importedCount = 0;

    for (const week of manifest) {
      for (const day of week.days) {
        if (!day.workoutName || day.exercises.length === 0) continue;
        const workoutName = `${program.title} – ${day.workoutName}`;
        // Skip if a workout with this name already exists
        if (workouts.some(w => w.name === workoutName)) continue;
        addWorkout({
          id: crypto.randomUUID(),
          name: workoutName,
          exercises: day.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            notes: ex.notes || undefined,
            sets: ex.sets.map(s => ({
              weight: s.targetWeight || 0,
              reps: s.targetReps || 10,
              setType: (s.setType as any) || 'normal',
              intensity: (s.intensity as any) || undefined,
              targetReps: s.setType === 'challenge' ? s.targetReps : undefined,
            })),
          })),
          createdAt: new Date(),
        });
        importedCount++;
      }
    }

    // Create a workout plan from week 1 of the program
    const week1 = manifest[0];
    if (week1 && importedCount > 0) {
      const addWorkoutPlan = useWorkoutStore.getState().addWorkoutPlan;
      const weeklyAssignments = { ...DEFAULT_WEEKLY_ASSIGNMENTS };
      const dayMap: Record<string, number> = {
        'monday': 1, 'mon': 1,
        'tuesday': 2, 'tue': 2,
        'wednesday': 3, 'wed': 3,
        'thursday': 4, 'thu': 4,
        'friday': 5, 'fri': 5,
        'saturday': 6, 'sat': 6,
        'sunday': 0, 'sun': 0,
      };
      week1.days.forEach((day, i) => {
        if (!day.workoutName || day.exercises.length === 0) return;
        const workoutName = `${program!.title} – ${day.workoutName}`;
        const workout = useWorkoutStore.getState().workouts.find(w => w.name === workoutName);
        if (!workout) return;
        const labelLower = day.label?.toLowerCase() || '';
        const dayIndex = Object.entries(dayMap).find(([key]) => labelLower.includes(key))?.[1];
        const assignIndex = dayIndex !== undefined ? dayIndex : Math.min(i + 1, 6);
        weeklyAssignments[String(assignIndex) as keyof typeof weeklyAssignments] = {
          type: 'Workout',
          workoutId: workout.id,
        };
      });
      addWorkoutPlan({
        id: crypto.randomUUID(),
        planId: crypto.randomUUID(),
        name: program!.title,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: null,
        weeklyAssignments,
        exceptions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      });
    }

    setShowImportDialog(false);
    if (importedCount > 0) {
      toast.success(`Imported ${importedCount} workout${importedCount > 1 ? 's' : ''} and created "${program!.title}" plan`);
    } else {
      toast.info('No new workouts to import');
    }
  };

  const handleReport = async () => {
    if (!program || !user || !reportReason) return;
    const { error } = await supabase.from('program_reports').insert({
      program_id: program.program_id,
      reporter_id: user.id,
      reason: reportReason,
    });
    if (error) { toast.error('Failed to submit report'); return; }
    toast.success('Report submitted');
    setShowReportDialog(false);
    setReportReason('');
  };

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto px-4 py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!program) return null;

  const manifest = program.manifest as ProgramWeek[];

  return (
    <Layout>
      <div className="container max-w-lg mx-auto animate-fade-in">
        {/* Banner */}
        {program.banner_image_url ? (
          <div className="h-48 w-full overflow-hidden relative">
            <img src={program.banner_image_url} alt={program.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <Button variant="ghost" size="icon" className="absolute top-4 left-4 bg-background/50 backdrop-blur" onClick={() => navigate('/marketplace')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <div className="h-36 w-full bg-gradient-to-br from-primary/20 to-primary/5 relative flex items-center justify-center">
            <Dumbbell className="w-12 h-12 text-primary/30" />
            <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => navigate('/marketplace')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        <div className="px-4 space-y-4 pb-32">
          {/* Title */}
          <div className="-mt-6 relative z-10">
            <h1 className="text-2xl font-bold tracking-tight">{program.title}</h1>
            {program.short_description && (
              <p className="text-sm text-muted-foreground mt-1">{program.short_description}</p>
            )}
          </div>

          {/* Coach card */}
          <Card className={cn("bg-card/80", glowEnabled && "card-glow")}>
            <CardContent className="p-3 flex items-center gap-3">
              {program.coach_avatar ? (
                <img src={program.coach_avatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{(program.coach_name || '?')[0]}</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{program.coach_name || 'Coach'}</span>
                  {program.coach_verified && <Award className="w-3.5 h-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground">Program Creator</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Difficulty', value: program.difficulty, icon: Star },
              { label: 'Weeks', value: `${program.total_weeks || '?'}`, icon: Calendar },
              { label: 'Days/wk', value: `${program.days_per_week || '?'}`, icon: Dumbbell },
              { label: 'Followers', value: `${followCount}`, icon: Users },
            ].map(stat => (
              <Card key={stat.label} className="bg-muted/30">
                <CardContent className="p-2.5 text-center">
                  <stat.icon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                  <p className="text-xs font-bold">{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {program.category_tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
            {program.equipment_tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
            <Badge variant={program.visibility === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
              {program.visibility === 'paid' ? `$${program.price_amount}` : 'Free'}
            </Badge>
          </div>

          {/* Long description */}
          {program.long_description && (
            <Card className="bg-card/60">
              <CardContent className="p-4">
                <h2 className="font-semibold text-sm mb-2">About This Program</h2>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{program.long_description}</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline preview */}
          {manifest.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold text-sm">Program Timeline</h2>
              {manifest.map((week, wi) => {
                const isPreview = program.visibility === 'paid' && wi >= program.preview_weeks && program.preview_weeks > 0;
                return (
                  <Card key={wi} className={cn("bg-card/60", isPreview && "opacity-50")}>
                    <CardContent className="p-0">
                      <button
                        className="w-full flex items-center justify-between p-3"
                        onClick={() => setExpandedWeek(expandedWeek === wi ? null : wi)}
                        disabled={isPreview}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{week.label}</span>
                          <Badge variant="secondary" className="text-[9px]">{week.days.length} days</Badge>
                          {isPreview && <Badge variant="outline" className="text-[9px]">🔒 Paid</Badge>}
                        </div>
                        {expandedWeek === wi ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      {expandedWeek === wi && !isPreview && (
                        <div className="px-3 pb-3 space-y-1.5">
                          {week.days.map((day, di) => (
                            <div key={di} className="bg-muted/20 rounded-lg p-2">
                              <p className="text-[11px] font-medium">{day.label}{day.workoutName ? ` — ${day.workoutName}` : ''}</p>
                              {day.exercises.map((ex, ei) => (
                                <p key={ei} className="text-[10px] text-muted-foreground ml-2">
                                  • {ex.exerciseName} ({ex.sets.length} sets)
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Report */}
          <button
            className="text-[10px] text-muted-foreground underline"
            onClick={() => setShowReportDialog(true)}
          >
            <Flag className="w-3 h-3 inline mr-1" />Report this program
          </button>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/50 p-4">
          <div className="container max-w-lg mx-auto">
            {alreadyFollowed ? (
              <Button className="w-full" variant="secondary" disabled>
                <Check className="w-4 h-4 mr-2" /> Following
              </Button>
            ) : program.visibility === 'paid' ? (
              <Button className="w-full" onClick={handleFollow} disabled={following}>
                {following ? 'Processing...' : `Buy — $${program.price_amount}`}
              </Button>
            ) : (
              <Button className="w-full" onClick={handleFollow} disabled={following}>
                {following ? 'Following...' : 'Follow Program'}
              </Button>
            )}
          </div>
        </div>

        {/* Import dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Workouts</DialogTitle>
              <DialogDescription>
                Would you like to import the program's workouts into your library?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                This will create {manifest.reduce((s, w) => s + w.days.filter(d => d.exercises.length > 0).length, 0)} workout templates in your library.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowImportDialog(false)}>
                  Skip
                </Button>
                <Button className="flex-1" onClick={handleImportWorkouts}>
                  Import Workouts
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Program</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {['Spam', 'Inappropriate content', 'Poor quality', 'Policy violation'].map(reason => (
                <Button
                  key={reason}
                  variant={reportReason === reason ? 'default' : 'outline'}
                  className="w-full justify-start text-sm"
                  onClick={() => setReportReason(reason)}
                >
                  {reason}
                </Button>
              ))}
              <Button className="w-full" onClick={handleReport} disabled={!reportReason}>
                Submit Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
