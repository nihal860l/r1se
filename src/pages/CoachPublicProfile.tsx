import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Award, ArrowLeft, ExternalLink, Users, Calendar, Dumbbell, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlowStore } from '@/store/glowStore';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useCoachingRelationship } from '@/hooks/useCoachingRelationship';
import { useAppMode } from '@/hooks/useAppMode';
import { useAuth } from '@/hooks/useAuth';
import { usePrograms } from '@/hooks/usePrograms';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const GOAL_OPTIONS = ['Build Muscle', 'Lose Fat', 'Strength', 'Athletic Performance', 'General Fitness'];
const EXPERIENCE_OPTIONS = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT_OPTIONS = ['full_gym', 'home_gym', 'bodyweight_only'];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function CoachPublicProfile() {
  const { coachId } = useParams<{ coachId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const { mode } = useAppMode();
  const { applyToCoach, relationship } = useCoachingRelationship();

  const [profile, setProfile] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplication, setShowApplication] = useState(false);

  // Application form state
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [days, setDays] = useState(4);
  const [equipment, setEquipment] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!coachId) return;
    (async () => {
      const { data: p } = await supabase.from('coach_profiles')
        .select('id, user_id, display_name, bio, avatar_url, is_verified, external_link, accepts_clients, created_at')
        .eq('user_id', coachId)
        .maybeSingle();
      setProfile(p);

      const { data: progs } = await supabase.from('programs')
        .select('program_id, title, short_description, difficulty, total_weeks, days_per_week, visibility, price_amount, banner_image_url, category_tags')
        .eq('coach_id', coachId)
        .eq('status', 'published');
      setPrograms(progs || []);
      setLoading(false);
    })();
  }, [coachId]);

  const isAlreadyClient = relationship?.coach_id === coachId && relationship?.status === 'active';

  const handleApply = async () => {
    if (!coachId) return;
    setSubmitting(true);
    const { error } = await applyToCoach(coachId, {
      training_goal: goal, experience_level: experience,
      training_days_per_week: days, equipment_access: equipment,
      client_note: note || undefined,
    });
    setSubmitting(false);
    if (error) { toast.error('Failed to send application'); return; }
    toast.success(`Application sent. You'll be notified when ${profile?.display_name || 'the coach'} responds.`);
    setShowApplication(false);
  };

  if (loading) return <Layout><div className="container max-w-lg px-4 py-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></Layout>;
  if (!profile) return <Layout><div className="container max-w-lg px-4 py-12 text-center"><p className="text-muted-foreground">Coach not found</p></div></Layout>;

  return (
    <Layout>
      <div className="container max-w-lg mx-auto animate-fade-in">
        {/* Banner */}
        <div className="h-40 w-full bg-gradient-to-br from-primary/20 to-transparent relative">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-4 -mt-9">
          {/* Avatar */}
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-[72px] h-[72px] rounded-full border-4 border-background object-cover" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full border-4 border-background bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{(profile.display_name || '?')[0]}</span>
            </div>
          )}

          {/* Name + Info */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{profile.display_name}</h1>
              {profile.is_verified && <Award className="w-4 h-4 text-primary" />}
            </div>
            {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
            {profile.external_link && (
              <a href={profile.external_link} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> {profile.external_link}
              </a>
            )}
            <p className="text-xs text-muted-foreground">Train Smart, R1SE Harder</p>
          </div>

          {/* Stats */}
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary">{programs.length} Programs</Badge>
            <Badge variant="secondary">Since {format(new Date(profile.created_at), 'MMM yyyy')}</Badge>
            <Badge variant="secondary">{profile.is_verified ? 'Verified' : 'Community Coach'}</Badge>
          </div>

          {/* CTA */}
          <div className="mt-6">
            {isAlreadyClient ? (
              <Button className="w-full" onClick={() => navigate('/messages')}>
                ✓ You're a client — Go to Messages
              </Button>
            ) : profile.accepts_clients && mode !== 'coach' ? (
              <>
                <Button glow={glowEnabled} className="w-full" onClick={() => setShowApplication(true)}>
                  Apply for Personal Training
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-2">Spots are limited. Apply to work directly with {profile.display_name}.</p>
              </>
            ) : !profile.accepts_clients ? (
              <Button variant="outline" className="w-full" disabled>Not Accepting Clients</Button>
            ) : null}
          </div>

          {/* Programs */}
          {programs.length > 0 && (
            <div className="mt-8 space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Programs by {profile.display_name}</h2>
              {programs.map(program => (
                <Card key={program.program_id} className={cn("cursor-pointer", glowEnabled && "card-glow")} onClick={() => navigate(`/marketplace/${program.program_id}`)}>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-sm">{program.title}</h3>
                    {program.short_description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{program.short_description}</p>}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-[9px]">{program.difficulty}</Badge>
                      <span className="text-[10px] text-muted-foreground">{program.total_weeks}w</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Application Sheet */}
      <Sheet open={showApplication} onOpenChange={setShowApplication}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Apply to Train with {profile.display_name}</SheetTitle>
            <p className="text-sm text-muted-foreground">Your coach reviews every application personally. Be specific — it helps them help you.</p>
          </SheetHeader>
          <div className="space-y-5 mt-4 pb-[env(safe-area-inset-bottom)]">
            <div>
              <p className="text-sm font-medium mb-2">What's your primary goal?</p>
              <div className="flex flex-wrap gap-2">{GOAL_OPTIONS.map(g => (
                <Badge key={g} variant={goal === g ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setGoal(g)}>{g}</Badge>
              ))}</div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Experience level</p>
              <div className="flex gap-2">{EXPERIENCE_OPTIONS.map(e => (
                <Badge key={e} variant={experience === e ? 'default' : 'outline'} className="cursor-pointer capitalize" onClick={() => setExperience(e)}>{e}</Badge>
              ))}</div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Days per week you can train</p>
              <div className="flex gap-2">{DAYS_OPTIONS.map(d => (
                <Badge key={d} variant={days === d ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setDays(d)}>{d}</Badge>
              ))}</div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Equipment access</p>
              <div className="flex gap-2">{EQUIPMENT_OPTIONS.map(e => (
                <Badge key={e} variant={equipment === e ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setEquipment(e)}>
                  {e.replace(/_/g, ' ')}
                </Badge>
              ))}</div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Anything else your coach should know?</p>
              <Textarea placeholder="Injuries, schedule constraints, specific goals..." maxLength={300} value={note} onChange={e => setNote(e.target.value)} />
              <p className="text-[10px] text-muted-foreground text-right mt-1">{note.length}/300</p>
            </div>
            <Button className="w-full" onClick={handleApply} disabled={submitting || !goal || !experience || !equipment}>
              {submitting ? 'Sending...' : 'Send Application'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
