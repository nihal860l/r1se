import { useState, useEffect, useRef, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useCoachingRelationship, Message } from '@/hooks/useCoachingRelationship';
import { useCoachClients } from '@/hooks/useCoachClients';
import { useAppMode } from '@/hooks/useAppMode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const { user } = useAuth();
  const { mode } = useAppMode();
  const navigate = useNavigate();

  if (mode === 'coach') return <CoachInbox />;
  return <ClientChat />;
}

function ClientChat() {
  const { user } = useAuth();
  const { relationship, coachProfile, messages, sendMessage, loadMessages, markMessagesRead } = useCoachingRelationship();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { markMessagesRead(); }, [messages.length, markMessagesRead]);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!relationship) return;
    const channel = supabase.channel(`messages-${relationship.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `coach_client_id=eq.${relationship.id}` },
        () => { loadMessages(); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [relationship, loadMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    await sendMessage(input.trim());
    setInput('');
    setSending(false);
  };

  if (!relationship) {
    return (
      <Layout>
        <div className="container max-w-lg px-4 py-12 text-center">
          <p className="text-muted-foreground">No active coaching relationship.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/marketplace')}>Find a Coach</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideNav>
      <div className="container max-w-lg mx-auto flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <p className="font-semibold text-sm">{coachProfile?.display_name || 'Coach'}</p>
            <p className="text-[10px] text-muted-foreground">Your Coach</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-2">
            <Input
              value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..."
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function CoachInbox() {
  const { user } = useAuth();
  const { activeClients } = useCoachClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (selectedClientId) {
    const client = activeClients.find(c => c.id === selectedClientId);
    if (client) return <CoachChat coachClient={client} onBack={() => setSelectedClientId(null)} />;
  }

  return (
    <Layout>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
        {activeClients.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No active conversations.</p></CardContent></Card>
        ) : activeClients.map(client => (
          <button key={client.id} onClick={() => setSelectedClientId(client.id)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{(client.client_profile?.display_name || '?')[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{client.client_profile?.display_name || 'Client'}</p>
              <p className="text-[10px] text-muted-foreground">Tap to chat</p>
            </div>
          </button>
        ))}
      </div>
    </Layout>
  );
}

function CoachChat({ coachClient, onBack }: { coachClient: any; onBack: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase.from('messages')
      .select('id, coach_client_id, sender_id, content, read_at, created_at')
      .eq('coach_client_id', coachClient.id)
      .order('created_at');
    if (data) setMessages(data as Message[]);
  }, [coachClient.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  useEffect(() => {
    const channel = supabase.channel(`coach-msgs-${coachClient.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `coach_client_id=eq.${coachClient.id}` },
        () => loadMessages()
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coachClient.id, loadMessages]);

  // Mark as read
  useEffect(() => {
    if (!user) return;
    supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('coach_client_id', coachClient.id).neq('sender_id', user.id).is('read_at', null).then();
  }, [messages.length, user, coachClient.id]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    await supabase.from('messages').insert({ coach_client_id: coachClient.id, sender_id: user.id, content: input.trim() });
    setInput('');
    setSending(false);
    await loadMessages();
  };

  return (
    <Layout hideNav>
      <div className="container max-w-lg mx-auto flex flex-col h-[calc(100vh-64px)]">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <p className="font-semibold text-sm">{coachClient.client_profile?.display_name || 'Client'}</p>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />)}
        </div>
        <div className="p-4 border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..."
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} className="flex-1" />
            <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[75%] px-3 py-2",
        isMine ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm" : "bg-secondary text-foreground rounded-2xl rounded-bl-sm"
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={cn("text-[10px] mt-1", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {format(new Date(message.created_at), 'HH:mm')}
        </p>
      </div>
    </div>
  );
}
