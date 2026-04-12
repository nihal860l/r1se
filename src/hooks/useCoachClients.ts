import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CoachClient {
  id: string;
  coach_id: string;
  client_id: string;
  status: string;
  training_goal: string | null;
  experience_level: string | null;
  training_days_per_week: number | null;
  equipment_access: string | null;
  client_note: string | null;
  assigned_program_id: string | null;
  assigned_program_week: number | null;
  check_in_day: number | null;
  applied_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  client_profile?: { display_name: string | null; avatar_url: string | null };
}

export interface ClientMessage {
  id: string;
  coach_client_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export function useCoachClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      const { data } = await supabase
        .from('coach_clients')
        .select('id, coach_id, client_id, status, training_goal, experience_level, training_days_per_week, equipment_access, client_note, assigned_program_id, assigned_program_week, check_in_day, applied_at, accepted_at, created_at, updated_at')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        // Fetch client profiles
        const clientIds = data.map((c: any) => c.client_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', clientIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const enriched = data.map((c: any) => ({
          ...c,
          client_profile: profileMap.get(c.client_id) || { display_name: null, avatar_url: null },
        }));
        setClients(enriched as CoachClient[]);
      }
    } catch (err) {
      console.error('Error fetching coach clients:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const acceptClient = useCallback(async (id: string) => {
    const { error } = await supabase.from('coach_clients')
      .update({ status: 'active', accepted_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetchClients();
    return { error };
  }, [fetchClients]);

  const declineClient = useCallback(async (id: string) => {
    const { error } = await supabase.from('coach_clients')
      .update({ status: 'declined' })
      .eq('id', id);
    if (!error) await fetchClients();
    return { error };
  }, [fetchClients]);

  const endRelationship = useCallback(async (id: string) => {
    const { error } = await supabase.from('coach_clients')
      .update({ status: 'ended' })
      .eq('id', id);
    if (!error) await fetchClients();
    return { error };
  }, [fetchClients]);

  const assignProgram = useCallback(async (clientId: string, programId: string, startWeek: number) => {
    const client = clients.find(c => c.client_id === clientId);
    if (!client) return { error: new Error('Client not found') };
    const { error } = await supabase.from('coach_clients')
      .update({ assigned_program_id: programId, assigned_program_week: startWeek })
      .eq('id', client.id);
    if (!error) await fetchClients();
    return { error };
  }, [clients, fetchClients]);

  const sendMessage = useCallback(async (coachClientId: string, content: string) => {
    if (!user) return;
    return supabase.from('messages').insert({
      coach_client_id: coachClientId, sender_id: user.id, content,
    }).select().single();
  }, [user]);

  const getClientProgress = useCallback(async (clientId: string) => {
    const { data: history } = await supabase
      .from('workout_history')
      .select('id, workout_name, completed_at, duration, exercises')
      .eq('user_id', clientId)
      .order('completed_at', { ascending: false })
      .limit(20);
    return history || [];
  }, []);

  const pendingClients = clients.filter(c => c.status === 'pending');
  const activeClients = clients.filter(c => c.status === 'active');

  return {
    clients, pendingClients, activeClients, loading,
    acceptClient, declineClient, endRelationship, assignProgram,
    sendMessage, getClientProgress, refetch: fetchClients,
  };
}
