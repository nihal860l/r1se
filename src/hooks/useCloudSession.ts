import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ActiveSession } from './useActiveSession';
import { Json } from '@/integrations/supabase/types';

/**
 * Cloud persistence for active workout sessions.
 * Saves full session state on pause, loads on resume, clears on finish/cancel.
 */
export function useCloudSession() {
  const { user } = useAuth();

  const saveSessionToCloud = useCallback(async (session: ActiveSession): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('active_sessions')
        .upsert({
          user_id: user.id,
          session_data: session as unknown as Json,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Failed to save session to cloud:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to save session to cloud:', error);
      return false;
    }
  }, [user]);

  const loadSessionFromCloud = useCallback(async (): Promise<ActiveSession | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('session_data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) return null;
      return data.session_data as unknown as ActiveSession;
    } catch {
      return null;
    }
  }, [user]);

  const clearCloudSession = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('active_sessions')
        .delete()
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Failed to clear cloud session:', error);
    }
  }, [user]);

  return { saveSessionToCloud, loadSessionFromCloud, clearCloudSession };
}
