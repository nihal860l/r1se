import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppMode = 'coach' | 'client' | 'normal';

interface CoachClientRelationship {
  id: string;
  coach_id: string;
  client_id: string;
  status: string;
  assigned_program_id: string | null;
  assigned_program_week: number | null;
  check_in_day: number | null;
}

export function useAppMode() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AppMode>('normal');
  const [coachProfile, setCoachProfile] = useState<any>(null);
  const [clientRelationship, setClientRelationship] = useState<CoachClientRelationship | null>(null);
  const [loading, setLoading] = useState(true);

  const determineMode = useCallback(async () => {
    if (!user) {
      setMode('normal');
      setCoachProfile(null);
      setClientRelationship(null);
      setLoading(false);
      return;
    }

    try {
      // Check coach mode
      const coachToggle = localStorage.getItem('coach-mode-active');
      if (coachToggle === 'true') {
        const { data: profile } = await supabase
          .from('coach_profiles')
          .select('id, user_id, display_name, bio, avatar_url, is_verified, status, accepts_clients')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (profile) {
          setCoachProfile(profile);
          setMode('coach');
          setClientRelationship(null);
          setLoading(false);
          return;
        }
      }

      // Check client mode
      const { data: clientRel } = await supabase
        .from('coach_clients')
        .select('id, coach_id, client_id, status, assigned_program_id, assigned_program_week, check_in_day')
        .eq('client_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (clientRel) {
        setClientRelationship(clientRel as CoachClientRelationship);
        setMode('client');
        setCoachProfile(null);
        setLoading(false);
        return;
      }

      setMode('normal');
      setCoachProfile(null);
      setClientRelationship(null);
    } catch (err) {
      console.error('Error determining app mode:', err);
      setMode('normal');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    determineMode();
  }, [determineMode]);

  // Listen for storage changes (coach toggle)
  useEffect(() => {
    const handler = () => determineMode();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [determineMode]);

  return { mode, coachProfile, clientRelationship, loading, refresh: determineMode };
}
