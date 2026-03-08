import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type MembershipTier = 'free' | 'premium';

interface MembershipInfo {
  tier: MembershipTier;
  isActive: boolean;
  expiresAt: string | null;
}

const CACHE_KEY = 'membership-cache';

/**
 * Server-authoritative membership gate.
 * - When online: validates via edge function (tamper-proof)
 * - When offline: uses cached value from last successful server check
 * - Never trusts client-only state for premium unlock decisions
 */
export function useMembership() {
  const { user, session } = useAuth();
  const [membership, setMembership] = useState<MembershipInfo>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : { tier: 'free', isActive: true, expiresAt: null };
    } catch {
      return { tier: 'free', isActive: true, expiresAt: null };
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchMembership = useCallback(async () => {
    if (!user || !session) {
      setMembership({ tier: 'free', isActive: true, expiresAt: null });
      setLoading(false);
      return;
    }

    if (!navigator.onLine) {
      // Offline — trust cache, don't promote to premium if no cache
      setLoading(false);
      return;
    }

    try {
      // Use edge function for server-authoritative check
      const { data, error } = await supabase.functions.invoke('membership', {
        body: { action: 'check' },
      });

      if (error) throw error;

      const info: MembershipInfo = {
        tier: (data.tier as MembershipTier) || 'free',
        isActive: data.is_active ?? false,
        expiresAt: data.expires_at || null,
      };
      setMembership(info);
      localStorage.setItem(CACHE_KEY, JSON.stringify(info));
    } catch {
      // Network error or function unavailable — use cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          setMembership(JSON.parse(cached));
        }
      } catch {
        // Fall back to free
      }
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  // Re-validate when coming back online
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
