import { Layout } from '@/components/Layout';
import { Award, FileText, Eye, Users, Plus, Settings, BarChart3, Copy, MoreVertical, Send, Archive, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useCoachClients } from '@/hooks/useCoachClients';
import { usePrograms } from '@/hooks/usePrograms';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useGlowStore } from '@/store/glowStore';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

export default function CoachDashboard() {
  const { isCoach, coachProfile, loading, updateProfile } = useCoachProfile();
  const { programs, loading: programsLoading, publishProgram, unpublishProgram, deleteProgram, duplicateProgram } = usePrograms();
  const { pendingClients, activeClients, loading: clientsLoading, acceptClient, declineClient } = useCoachClients();
  const { user } = useAuth();
  const navigate = useNavigate();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const [activeTab, setActiveTab] = useState('clients');

  // Profile settings state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [acceptsClients, setAcceptsClients] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isCoach) navigate('/');
  }, [loading, isCoach, navigate]);

  useEffect(() => {
    if (coachProfile) {
      setEditName(coachProfile.display_name || '');
      setEditBio(coachProfile.bio || '');
      setEditLink(coachProfile.external_link || '');
      setEditAvatar(coachProfile.avatar_url || '');
      // accepts_clients may not be on the type yet, handle gracefully
      setAcceptsClients((coachProfile as any).accepts_clients ?? true);
    }
  }, [coachProfile]);

  // Set coach-mode-active on mount
  useEffect(() => {
    localStorage.setItem('coach-mode-active', 'true');
    window.dispatchEvent(new Event('storage'));
  }, []);

  if (loading || programsLoading) {
    return <Layout><div className="container max-w-lg mx-auto px-4 py-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></Layout>;
  }
  if (!isCoach) return null;

  const drafts = programs.filter(p => p.status === 'draft');
  const published = programs.filter(p => p.status === 'published');

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ display_name: editName, bio: editBio || null, external_link: editLink || null, avatar_url: editAvatar || null });
    // Update accepts_clients directly
    await supabase.from('coach_profiles').update({ accepts_clients: acceptsClients } as any).eq('user_id', user?.id);
    setSaving(false);
    toast.success('Profile updated');
  };

  const handleAccept = async (id: string) => {
    const { error } = await acceptClient(id);
    if (error) toast.error('Failed to accept'); else toast.success('Client accepted');
  };

  const handleDecline = async (id: string) => {
    const { error } = await declineClient(id);
    if (error) toast.error('Failed to decline'); else toast.success('Application declined');
  };

  return (
    <Layout>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Coach Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome, {coachProfile?.display_name}
              {coachProfile?.is_verified && <span className="inline-flex items-center ml-1 text-primary"><Award className="w-3.5 h-3.5" /></span>}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Clients', value: activeClients.length, icon: Users },
            { label: 'Programs', value: programs.length, icon: FileText },
            { label: 'Published', value: published.length, icon: Eye },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className={cn("bg-card/80", glowEnabled && "card-glow")}>
              <CardContent className="p-4 text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="clients" className="flex-1">Clients</TabsTrigger>
            <TabsTrigger value="programs" className="flex-1">Programs</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
          </TabsList>

          {/* CLIENTS TAB */}
          <TabsContent value="clients" className="space-y-4 mt-4">
            {pendingClients.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pending Applications</h2>
                {pendingClients.map(client => (
                  <Card key={client.id} className="border-primary/20">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{(client.client_profile?.display_name || '?')[0]}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{client.client_profile?.display_name || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">Applied {new Date(client.applied_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {client.training_goal && <Badge variant="secondary" className="text-[10px]">{client.training_goal}</Badge>}
                        {client.experience_level && <Badge variant="outline" className="text-[10px] capitalize">{client.experience_level}</Badge>}
                        {client.equipment_access && <Badge variant="outline" className="text-[10px]">{client.equipment_access.replace(/_/g, ' ')}</Badge>}
                      </div>
                      {client.client_note && <p className="text-xs text-muted-foreground">{client.client_note}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => handleAccept(client.id)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDecline(client.id)}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeClients.length > 0 ? (
              <div className="space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Active Clients</h2>
                {activeClients.map(client => (
                  <Card key={client.id} className={cn("cursor-pointer hover:border-primary/30 transition-colors", glowEnabled && "card-glow")}
                    onClick={() => navigate('/messages')}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{(client.client_profile?.display_name || '?')[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{client.client_profile?.display_name || 'Client'}</p>
                        <p className="text-[10px] text-muted-foreground">{client.assigned_program_id ? 'Program assigned' : 'No program assigned'}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingClients.length === 0 && (
              <Card className="bg-card/60 border-dashed">
                <CardContent className="p-6 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-semibold text-sm">No clients yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Share your coach profile to start accepting clients.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PROGRAMS TAB */}
          <TabsContent value="programs" className="space-y-4 mt-4">
            <Button className="w-full gap-2" onClick={() => navigate('/coach/program/new')}>
              <Plus className="w-4 h-4" /> Create New Program
            </Button>
            {programs.map(program => (
              <Card key={program.program_id} className={cn("bg-card/80", glowEnabled && "card-glow")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{program.title}</h3>
                        <Badge variant={program.status === 'published' ? 'default' : 'secondary'} className="text-[9px] shrink-0">{program.status}</Badge>
                      </div>
                      {program.short_description && <p className="text-xs text-muted-foreground line-clamp-1">{program.short_description}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/coach/program/new?edit=${program.program_id}`)}><Settings className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                        {program.status === 'draft' ? (
                          <DropdownMenuItem onClick={() => publishProgram(program.program_id).then(() => toast.success('Published'))}><Send className="w-3.5 h-3.5 mr-2" /> Publish</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => unpublishProgram(program.program_id).then(() => toast.success('Unpublished'))}><Archive className="w-3.5 h-3.5 mr-2" /> Unpublish</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => duplicateProgram(program.program_id).then(() => toast.success('Duplicated'))}><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteProgram(program.program_id).then(() => toast.success('Deleted'))}><FileText className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
            {programs.length === 0 && (
              <Card className="bg-card/60 border-dashed"><CardContent className="p-6 text-center"><FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No programs yet.</p></CardContent></Card>
            )}
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card><CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={500} className="mt-1" />
                <p className="text-[10px] text-muted-foreground text-right">{editBio.length}/500</p>
              </div>
              <div>
                <label className="text-sm font-medium">External Link</label>
                <Input value={editLink} onChange={e => setEditLink(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Avatar URL</label>
                <Input value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="https://..." className="mt-1" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Accept Client Applications</p>
                  <p className="text-xs text-muted-foreground">Allow new clients to apply</p>
                </div>
                <Switch checked={acceptsClients} onCheckedChange={setAcceptsClients} />
              </div>
              {coachProfile?.is_verified && (
                <Badge className="text-xs"><Award className="w-3 h-3 mr-1" /> Verified Coach</Badge>
              )}
              <Button className="w-full" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
