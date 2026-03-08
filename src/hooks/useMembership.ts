import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type MembershipTier = 'free' | 'premium';

interface MembershipInfo {
  tier: MembershipTier;
  isActive: boolean;
  expiresAt: string | null;
}

/**
 * Server-authoritative membership gate.
 * - When online: fetches membership from server
 * - When offline: uses cached value from last successful fetch
 * - Never trusts client-only state for premium access
 */
export function useMembership() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<MembershipInfo>({
    tier: 'free',
    isActive: true,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchMembership = useCallback(async () => {
    if (!user) {
      setMembership({ tier: 'free', isActive: true, expiresAt: null });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('memberships')
        .select('tier, is_active, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const info: MembershipInfo = {
          tier: data.tier as MembershipTier,
          isActive: data.is_active,
          expiresAt: data.expires_at,
        };
        setMembership(info);
        // Cache for offline use
        localStorage.setItem('membership-cache', JSON.stringify(info));
      }
    } catch {
      // Offline or error - use cached value
      try {
        const cached = localStorage.getItem('membership-cache');
        if (cached) {
          setMembership(JSON.parse(cached));
        }
      } catch {
        // Fall back to free
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  // Re-check when coming back online
  useEffect(() => {
    const handleOnline = () => fetchMembership();
    window.addEventListener('app-online', handleOnline);
    return () => window.removeEventListener('app-online', handleOnline);
  }, [fetchMembership]);

  const isPremium = membership.tier === 'premium' && membership.isActive;

  return {
    membership,
    isPremium,
    loading,
    refetch: fetchMembership,
  };
}
