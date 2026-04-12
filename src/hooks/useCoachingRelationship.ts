import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CoachingRelationship {
  id: string;
  coach_id: string;
  client_id: string;
  status: string;
  training_goal: string | null;
  assigned_program_id: string | null;
  assigned_program_week: number | null;
  check_in_day: number | null;
}

export interface Message {
  id: string;
  coach_client_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export function useCoachingRelationship() {
  const { user } = useAuth();
  const [relationship, setRelationship] = useState<CoachingRelationship | null>(null);
  const [coachProfile, setCoachProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRelationship = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      const { data: rel } = await supabase
        .from('coach_clients')
        .select('id, coach_id, client_id, status, training_goal, assigned_program_id, assigned_program_week, check_in_day')
        .eq('client_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (rel) {
        setRelationship(rel as CoachingRelationship);
        const { data: coach } = await supabase
          .from('coach_profiles')
          .select('id, user_id, display_name, bio, avatar_url, is_verified, accepts_clients')
          .eq('user_id', rel.coach_id)
          .maybeSingle();
        setCoachProfile(coach);
      } else {
        setRelationship(null);
        setCoachProfile(null);
      }
    } catch (err) {
      console.error('Error fetching coaching relationship:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchRelationship(); }, [fetchRelationship]);

  const applyToCoach = useCallback(async (coachId: string, data: {
    training_goal?: string;
    experience_level?: string;
    training_days_per_week?: number;
    equipment_access?: string;
    client_note?: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data: result, error } = await supabase.from('coach_clients').insert({
      coach_id: coachId, client_id: user.id, status: 'pending', ...data,
    }).select().single();
    return { data: result, error };
  }, [user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !relationship) return;
    const { data, error } = await supabase.from('messages').insert({
      coach_client_id: relationship.id, sender_id: user.id, content,
    }).select().single();
    if (data && !error) setMessages(prev => [...prev, data as Message]);
    return { data, error };
  }, [user, relationship]);

  const loadMessages = useCallback(async () => {
    if (!relationship) return;
    const { data } = await supabase.from('messages')
      .select('id, coach_client_id, sender_id, content, read_at, created_at')
      .eq('coach_client_id', relationship.id)
      .order('created_at');
    if (data) setMessages(data as Message[]);
  }, [relationship]);

  const markMessagesRead = useCallback(async () => {
    if (!user || !relationship) return;
    await supabase.from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('coach_client_id', relationship.id)
      .neq('sender_id', user.id)
      .is('read_at', null);
    setMessages(prev => prev.map(m =>
      m.sender_id !== user.id && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
    ));
    setUnreadCount(0);
  }, [user, relationship]);

  const submitCheckIn = useCallback(async (data: {
    training_feel: number;
    energy_level: number;
    sleep_quality: number;
    soreness_note?: string;
    other_note?: string;
  }) => {
    if (!user || !relationship) return;
    const weekStart = getWeekStart();
    return supabase.from('check_ins').insert({
      coach_client_id: relationship.id, client_id: user.id,
      week_start_date: weekStart, ...data,
    }).select().single();
  }, [user, relationship]);

  // Count unread on messages change
  useEffect(() => {
    if (!user) return;
    const count = messages.filter(m => m.sender_id !== user.id && !m.read_at).length;
    setUnreadCount(count);
  }, [messages, user]);

  return {
    relationship, coachProfile, messages, unreadCount, loading,
    applyToCoach, sendMessage, loadMessages, markMessagesRead, submitCheckIn,
    refetch: fetchRelationship,
  };
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now.setDate(diff));
  return start.toISOString().split('T')[0];
}
