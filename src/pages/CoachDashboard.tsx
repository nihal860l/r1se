import { Layout } from '@/components/Layout';
import { Award, FileText, Eye, Users, Plus, Settings, BarChart3, Copy, MoreVertical, Send, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { usePrograms } from '@/hooks/usePrograms';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useGlowStore } from '@/store/glowStore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function CoachDashboard() {
  const { isCoach, coachProfile, loading } = useCoachProfile();
  const { programs, loading: programsLoading, publishProgram, unpublishProgram, deleteProgram, duplicateProgram } = usePrograms();
  const { user } = useAuth();
  const navigate = useNavigate();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);

  useEffect(() => {
    if (!loading && !isCoach) {
      navigate('/');
    }
  }, [loading, isCoach, navigate]);

  if (loading || programsLoading) {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto px-4 py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isCoach) return null;

  const drafts = programs.filter(p => p.status === 'draft');
  const published = programs.filter(p => p.status === 'published');

  const stats = [
    { label: 'Programs', value: programs.length, icon: FileText },
    { label: 'Published', value: published.length, icon: Eye },
    { label: 'Drafts', value: drafts.length, icon: Archive },
  ];

  const handlePublish = async (programId: string) => {
    const res = await publishProgram(programId);
    if (res.error) { toast.error('Failed to publish'); return; }
    toast.success('Program published!');
  };

  const handleUnpublish = async (programId: string) => {
    const res = await unpublishProgram(programId);
    if (res.error) { toast.error('Failed to unpublish'); return; }
    toast.success('Program unpublished');
  };

  const handleDelete = async (programId: string) => {
    const res = await deleteProgram(programId);
    if (res.error) { toast.error('Failed to delete'); return; }
    toast.success('Program deleted');
  };

  const handleDuplicate = async (programId: string) => {
    const res = await duplicateProgram(programId);
    if (res.error) { toast.error('Failed to duplicate'); return; }
    toast.success('Program duplicated');
  };

  return (
    <Layout>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Coach Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome, {coachProfile?.display_name}
              {coachProfile?.is_verified && (
                <span className="inline-flex items-center ml-1 text-primary">
                  <Award className="w-3.5 h-3.5" />
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className={cn("bg-card/80", glowEnabled && "card-glow")}>
              <CardContent className="p-4 text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create */}
        <Button className="w-full gap-2" onClick={() => navigate('/coach/program/new')}>
          <Plus className="w-4 h-4" />
          Create New Program
        </Button>

        {/* Programs List */}
        {programs.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Your Programs</h2>
            {programs.map(program => (
              <Card key={program.program_id} className={cn("bg-card/80", glowEnabled && "card-glow")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{program.title}</h3>
                        <Badge
                          variant={program.status === 'published' ? 'default' : 'secondary'}
                          className="text-[9px] shrink-0"
                        >
                          {program.status}
                        </Badge>
                      </div>
                      {program.short_description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{program.short_description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[9px]">{program.difficulty}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {program.total_weeks || 0}w • {program.visibility === 'paid' ? `$${program.price_amount}` : 'Free'}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/coach/program/new?edit=${program.program_id}`)}>
                          <Settings className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        {program.status === 'draft' ? (
                          <DropdownMenuItem onClick={() => handlePublish(program.program_id)}>
                            <Send className="w-3.5 h-3.5 mr-2" /> Publish
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleUnpublish(program.program_id)}>
                            <Archive className="w-3.5 h-3.5 mr-2" /> Unpublish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicate(program.program_id)}>
                          <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(program.program_id)}>
                          <FileText className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {programs.length === 0 && (
          <Card className="bg-card/60 border-dashed">
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No programs yet. Create your first one!</p>
            </CardContent>
          </Card>
        )}

        {/* Bio Preview */}
        {coachProfile?.bio && (
          <Card className="bg-card/80">
            <CardContent className="p-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Your Bio</h2>
              <p className="text-sm">{coachProfile.bio}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
