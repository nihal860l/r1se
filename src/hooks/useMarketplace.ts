import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Program } from './usePrograms';

interface MarketplaceFilters {
  search?: string;
  difficulty?: string;
  category?: string;
  equipment?: string;
  visibility?: string;
  sort?: 'newest' | 'popular' | 'price_low' | 'price_high';
}

export function useMarketplace() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<(Program & { coach_name?: string; coach_avatar?: string; coach_verified?: boolean; follow_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MarketplaceFilters>({});

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch published programs
      let query = supabase
        .from('programs')
        .select('*')
        .eq('status', 'published');

      if (filters.difficulty && filters.difficulty !== 'All') {
        query = query.eq('difficulty', filters.difficulty);
      }
      if (filters.category) {
        query = query.contains('category_tags', [filters.category]);
      }
      if (filters.equipment) {
        query = query.contains('equipment_tags', [filters.equipment]);
      }
      if (filters.visibility === 'free') {
        query = query.eq('visibility', 'free');
      } else if (filters.visibility === 'paid') {
        query = query.eq('visibility', 'paid');
      }

      // Sort
      switch (filters.sort) {
        case 'price_low':
          query = query.order('price_amount', { ascending: true, nullsFirst: true });
          break;
        case 'price_high':
          query = query.order('price_amount', { ascending: false, nullsFirst: false });
          break;
        case 'popular':
          query = query.order('created_at', { ascending: false }); // TODO: sort by follow count
          break;
        default:
          query = query.order('published_at', { ascending: false, nullsFirst: false });
      }

      const { data: programsData, error } = await query;
      if (error) throw error;

      // Fetch coach profiles for all programs
      const coachIds = [...new Set((programsData || []).map(p => p.coach_id))];
      let coachMap: Record<string, { display_name: string; avatar_url: string | null; is_verified: boolean }> = {};

      if (coachIds.length > 0) {
        const { data: coaches } = await supabase
          .from('coach_profiles')
          .select('user_id, display_name, avatar_url, is_verified')
          .in('user_id', coachIds);

        if (coaches) {
          for (const c of coaches) {
            coachMap[c.user_id] = { display_name: c.display_name, avatar_url: c.avatar_url, is_verified: c.is_verified };
          }
        }
      }

      // Fetch follow counts
      const programIds = (programsData || []).map(p => p.program_id);
      let followCountMap: Record<string, number> = {};
      if (programIds.length > 0) {
        // We can't do aggregation via client, so we'll fetch follows and count client-side
        // This is acceptable for small-medium scale
        const { data: follows } = await supabase
          .from('program_follows')
          .select('program_id')
          .in('program_id', programIds);

        if (follows) {
          for (const f of follows) {
            followCountMap[f.program_id] = (followCountMap[f.program_id] || 0) + 1;
          }
        }
      }

      let mapped = (programsData || []).map(row => ({
        id: row.id,
        program_id: row.program_id,
        coach_id: row.coach_id,
        title: row.title,
        short_description: row.short_description,
        long_description: row.long_description,
        banner_image_url: row.banner_image_url,
        category_tags: row.category_tags || [],
        difficulty: row.difficulty || 'Intermediate',
        equipment_tags: row.equipment_tags || [],
        price_amount: row.price_amount,
        currency: row.currency,
        visibility: row.visibility || 'free',
        preview_weeks: row.preview_weeks || 0,
        status: row.status || 'published',
        version_number: row.version_number || 1,
        manifest: Array.isArray(row.manifest) ? row.manifest : [],
        days_per_week: row.days_per_week,
        total_weeks: row.total_weeks,
        promo_video_url: row.promo_video_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        published_at: row.published_at,
        coach_name: coachMap[row.coach_id]?.display_name,
        coach_avatar: coachMap[row.coach_id]?.avatar_url,
        coach_verified: coachMap[row.coach_id]?.is_verified,
        follow_count: followCountMap[row.program_id] || 0,
      }));

      // Client-side search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        mapped = mapped.filter(p =>
          p.title.toLowerCase().includes(q) ||
          (p.short_description || '').toLowerCase().includes(q) ||
          (p.coach_name || '').toLowerCase().includes(q) ||
          p.category_tags.some(t => t.toLowerCase().includes(q))
        );
      }

      setPrograms(mapped as any);
    } catch (err) {
      console.error('Error fetching marketplace:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const followProgram = async (programId: string, programVersion: number, manifest: any) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Check if already following
    const { data: existing } = await supabase
      .from('program_follows')
      .select('id')
      .eq('user_id', user.id)
      .eq('program_id', programId)
      .maybeSingle();

    if (existing) return { error: new Error('Already following this program') };

    const { data, error } = await supabase
      .from('program_follows')
      .insert({
        user_id: user.id,
        program_id: programId,
        program_version: programVersion,
        imported_manifest: manifest as any,
        is_scheduled: false,
      })
      .select()
      .single();

    if (error) return { error };

    // Track analytics
    await supabase.from('program_analytics').insert({
      program_id: programId,
      user_id: user.id,
      event_type: 'follow',
    });

    return { data };
  };

  const trackView = async (programId: string) => {
    if (!user) return;
    await supabase.from('program_analytics').insert({
      program_id: programId,
      user_id: user.id,
      event_type: 'view',
    });
  };

  return {
    programs,
    loading,
    filters,
    setFilters,
    followProgram,
    trackView,
    refetch: fetchPrograms,
  };
}
