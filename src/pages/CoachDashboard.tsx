import { Layout } from '@/components/Layout';
import { Award, FileText, Eye, Users, Plus, Settings, Copy, MoreVertical, Send, Archive, CheckCircle, XCircle, MessageCircle, TrendingUp, Image, LayoutDashboard, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

  // Client detail sheet state
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientDetailTab, setClientDetailTab] = useState('overview');
  const [clientMessages, setClientMessages] = useState<any[]>([]);
  const [clientCheckIns, setClientCheckIns] = useState<any[]>([]);
  const [clientPhotos, setClientPhotos] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showAssignProgram, setShowAssignProgram] = useState(false);
  const [assignStartWeek, setAssignStartWeek] = useState(1);
  const [assigningProgram, setAssigningProgram] = useState(false);

  useEffect(() => {
    if (!loading && !isCoach) navigate('/');
  }, [loading, isCoach, navigate]);

  useEffect(() => {
    if (coachProfile) {
      setEditName(coachProfile.display_name || '');
      setEditBio(coachProfile.bio || '');
      setEditLink(coachProfile.external_link || '');
      setEditAvatar(coachProfile.avatar_url || '');
      setAcceptsClients((coachProfile as any).accepts_clients ?? true);
    }
  }, [coachProfile]);

  // Set coach-mode-active on mount
  useEffect(() => {
    localStorage.setItem('coach-mode-active', 'true');
    window.dispatchEvent(new Event('storage'));
  }, []);

  const loadClientDetail = async (client: any) => {
    setSelectedClient(client);
    setClientDetailTab('overview');

    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, content, read_at, created_at')
      .eq('coach_client_id', client.id)
      .order('created_at', { ascending: true })
      .limit(50);
    setClientMessages(msgs || []);

    const { data: cins } = await supabase
      .from('check_ins')
      .select('id, week_start_date, training_feel, energy_level, sleep_quality, soreness_note, other_note, submitted_at')
      .eq('coach_client_id', client.id)
      .order('week_start_date', { ascending: false })
      .limit(8);
    setClientCheckIns(cins || []);

    const { data: photos } = await supabase
      .from('progress_photos')
      .select('id, storage_path, thumbnail_path, taken_at, notes')
      .eq('user_id', client.client_id)
      .eq('is_visible_to_coach', true)
      .order('taken_at', { ascending: false })
      .limit(30);
    if (photos) {
      const withUrls = await Promise.all(photos.map(async (p: any) => {
        const path = p.thumbnail_path || p.storage_path;
        const { data: url } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600);
        return { ...p, signedUrl: url?.signedUrl };
      }));
      setClientPhotos(withUrls);
    }
  };

  const sendCoachMessage = async () => {
    if (!msgInput.trim() || !selectedClient || !user) return;
    setSendingMsg(true);
    const { data } = await supabase.from('messages').insert({
      coach_client_id: selectedClient.id,
      sender_id: user.id,
      content: msgInput.trim(),
    }).select().single();
    if (data) setClientMessages(prev => [...prev, data]);
    setMsgInput('');
    setSendingMsg(false);
  };

  const handleAssignProgram = async (programId: string) => {
    if (!selectedClient) return;
    setAssigningProgram(true);
    const { error } = await supabase
      .from('coach_clients')
      .update({ assigned_program_id: programId, assigned_program_week: assignStartWeek })
      .eq('id', selectedClient.id);
    setAssigningProgram(false);
    if (error) { toast.error('Failed to assign program'); return; }
    toast.success('Program assigned');
    setShowAssignProgram(false);
    setSelectedClient((prev: any) => ({ ...prev, assigned_program_id: programId }));
  };

  if (loading || programsLoading) {
    return <Layout><div className="container max-w-lg mx-auto px-4 py-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></Layout>;
  }
  if (!isCoach) return null;

  const drafts = programs.filter(p => p.status === 'draft');
  const published = programs.filter(p => p.status === 'published');

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile({ display_name: editName, bio: editBio || null, external_link: editLink || null, avatar_url: editAvatar || null });
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
                    onClick={() => loadClientDetail(client)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{(client.client_profile?.display_name || '?')[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{client.client_profile?.display_name || 'Client'}</p>
                        <p className="text-[10px] text-muted-foreground">{client.assigned_program_id ? 'Program assigned' : 'No program assigned'}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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

      {/* Client Detail Sheet */}
      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0">
          {selectedClient && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
                {selectedClient.client_profile?.avatar_url ? (
                  <img src={selectedClient.client_profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="font-bold text-sm">{(selectedClient.client_profile?.display_name || '?')[0]}</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">{selectedClient.client_profile?.display_name || 'Client'}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedClient.training_goal || 'No goal set'} · {selectedClient.experience_level || ''}</p>
                </div>
                <button onClick={() => setSelectedClient(null)} className="p-2 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border shrink-0">
                {[
                  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                  { id: 'messages', icon: MessageCircle, label: 'Messages' },
                  { id: 'checkins', icon: TrendingUp, label: 'Check-ins' },
                  { id: 'photos', icon: Image, label: 'Photos' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setClientDetailTab(tab.id)}
                    className={cn("flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                      clientDetailTab === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">

                {/* OVERVIEW TAB */}
                {clientDetailTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-card border border-border rounded-xl">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Current Program</p>
                      {selectedClient.assigned_program_id ? (
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">
                            {programs.find(p => p.program_id === selectedClient.assigned_program_id)?.title || 'Program assigned'}
                          </p>
                          <p className="text-xs text-muted-foreground">Week {selectedClient.assigned_program_week || 1}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No program assigned</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 h-8 text-xs"
                        onClick={() => setShowAssignProgram(true)}
                      >
                        {selectedClient.assigned_program_id ? 'Reassign Program' : 'Assign Program'}
                      </Button>
                    </div>

                    {(selectedClient.equipment_access || selectedClient.training_days_per_week) && (
                      <div className="p-4 bg-card border border-border rounded-xl space-y-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Client Info</p>
                        {selectedClient.equipment_access && <p className="text-sm">Equipment: <span className="text-foreground font-medium">{selectedClient.equipment_access.replace(/_/g, ' ')}</span></p>}
                        {selectedClient.training_days_per_week && <p className="text-sm">Training days: <span className="text-foreground font-medium">{selectedClient.training_days_per_week}/week</span></p>}
                        {selectedClient.client_note && (
                          <div>
                            <p className="text-xs text-muted-foreground mt-2">Client note:</p>
                            <p className="text-sm mt-1 italic">"{selectedClient.client_note}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* MESSAGES TAB */}
                {clientDetailTab === 'messages' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-3 mb-4">
                      {clientMessages.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation.</p>
                      )}
                      {clientMessages.map(msg => (
                        <div key={msg.id} className={cn("flex", msg.sender_id === user?.id ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                            msg.sender_id === user?.id
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-secondary text-foreground rounded-bl-sm"
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 shrink-0 pt-2 border-t border-border">
                      <input
                        value={msgInput}
                        onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendCoachMessage()}
                        placeholder="Message your client..."
                        className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                      />
                      <Button size="icon" onClick={sendCoachMessage} disabled={sendingMsg || !msgInput.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* CHECK-INS TAB */}
                {clientDetailTab === 'checkins' && (
                  <div className="space-y-3">
                    {clientCheckIns.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No check-ins submitted yet.</p>
                    )}
                    {clientCheckIns.map(ci => (
                      <div key={ci.id} className="p-4 bg-card border border-border rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Week of {ci.week_start_date}</p>
                          <div className="flex gap-2">
                            {ci.training_feel && <span className="text-sm">{['😩','😕','😐','💪','🔥'][ci.training_feel - 1]}</span>}
                            {ci.energy_level && <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", ci.energy_level >= 4 ? "bg-primary/20 text-primary" : ci.energy_level >= 3 ? "bg-secondary text-foreground" : "bg-destructive/20 text-destructive")}>Energy {ci.energy_level}/5</span>}
                            {ci.sleep_quality && <span className="text-xs text-muted-foreground">Sleep {ci.sleep_quality}/5</span>}
                          </div>
                        </div>
                        {ci.soreness_note && <p className="text-sm text-muted-foreground italic">"{ci.soreness_note}"</p>}
                        {ci.other_note && <p className="text-sm text-foreground">"{ci.other_note}"</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* PHOTOS TAB */}
                {clientDetailTab === 'photos' && (
                  <div>
                    {clientPhotos.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-sm text-muted-foreground">No visible progress photos.</p>
                        <p className="text-xs text-muted-foreground mt-1">Your client controls photo visibility.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {clientPhotos.map(photo => (
                        <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-secondary">
                          {photo.signedUrl && (
                            <img src={photo.signedUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Program Sheet */}
      <Sheet open={showAssignProgram} onOpenChange={setShowAssignProgram}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assign Program</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm text-muted-foreground">Start on week:</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAssignStartWeek(w => Math.max(1, w - 1))}>-</Button>
                <span className="w-8 text-center font-bold">{assignStartWeek}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAssignStartWeek(w => w + 1)}>+</Button>
              </div>
            </div>
            {programs.map(program => (
              <div key={program.program_id} className="p-4 bg-card border border-border rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{program.title}</p>
                  <p className="text-xs text-muted-foreground">{program.total_weeks || '?'} weeks · {program.difficulty}</p>
                </div>
                <Button size="sm" onClick={() => handleAssignProgram(program.program_id)} disabled={assigningProgram}>
                  Assign
                </Button>
              </div>
            ))}
            {programs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No programs yet. Create one first.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
