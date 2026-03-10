import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CoachProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  status: string;
  external_link: string | null;
  pinned_program_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCoachProfile() {
  const { user } = useAuth();
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setCoachProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('coach_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setCoachProfile(data as CoachProfile | null);
    } catch (err) {
      console.error('Error fetching coach profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const createProfile = async (displayName: string, bio?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('coach_profiles')
      .insert({
        user_id: user.id,
        display_name: displayName,
        bio: bio || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .select()
      .single();

    if (error) return { error };
    setCoachProfile(data as CoachProfile);
    return { data };
  };

  const updateProfile = async (updates: Partial<Pick<CoachProfile, 'display_name' | 'bio' | 'avatar_url' | 'external_link'>>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('coach_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return { error };
    setCoachProfile(data as CoachProfile);
    return { data };
  };

  const deleteProfile = async () => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('coach_profiles')
      .delete()
      .eq('user_id', user.id);

    if (error) return { error };
    setCoachProfile(null);
    return {};
  };

  const isCoach = !!coachProfile && coachProfile.status === 'active';

  return {
    coachProfile,
    isCoach,
    loading,
    createProfile,
    updateProfile,
    deleteProfile,
    refetch: fetchProfile,
  };
}
