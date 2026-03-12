import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ProgramWeekDay {
  label: string;
  workoutName: string;
  exercises: ProgramExercise[];
}

export interface ProgramWeek {
  weekNumber: number;
  label: string;
  days: ProgramWeekDay[];
  phase?: string;
  isInfinite?: boolean;
  rangeEnd?: number; // e.g. weekNumber=1, rangeEnd=4 means "Weeks 1-4"
}

export interface ProgramExercise {
  exerciseId: string;
  exerciseName: string;
  sets: ProgramSet[];
  notes?: string;
  mediaUrl?: string;
}

export interface ProgramSet {
  targetReps?: number;
  targetWeight?: number;
  intensity?: string;
  setType?: string;
  restSeconds?: number;
}

export interface Program {
  id: string;
  program_id: string;
  coach_id: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  banner_image_url: string | null;
  category_tags: string[];
  difficulty: string;
  equipment_tags: string[];
  price_amount: number | null;
  currency: string | null;
  visibility: string;
  preview_weeks: number;
  status: string;
  version_number: number;
  manifest: ProgramWeek[];
  days_per_week: number | null;
  total_weeks: number | null;
  promo_video_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export function usePrograms() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = useCallback(async () => {
    if (!user) { setPrograms([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPrograms((data || []).map(mapProgram));
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const createProgram = async (input: {
    title: string;
    short_description?: string;
    long_description?: string;
    difficulty?: string;
    category_tags?: string[];
    equipment_tags?: string[];
    visibility?: string;
    price_amount?: number;
    currency?: string;
    preview_weeks?: number;
    banner_image_url?: string;
    promo_video_url?: string;
    manifest?: ProgramWeek[];
    days_per_week?: number;
    total_weeks?: number;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };
    const programId = crypto.randomUUID();
    const { data, error } = await supabase
      .from('programs')
      .insert({
        coach_id: user.id,
        program_id: programId,
        title: input.title,
        short_description: input.short_description || null,
        long_description: input.long_description || null,
        difficulty: input.difficulty || 'Intermediate',
        category_tags: input.category_tags || [],
        equipment_tags: input.equipment_tags || [],
        visibility: input.visibility || 'free',
        price_amount: input.price_amount || null,
        currency: input.currency || 'USD',
        preview_weeks: input.preview_weeks || 0,
        banner_image_url: input.banner_image_url || null,
        promo_video_url: input.promo_video_url || null,
        manifest: (input.manifest || []) as any,
        days_per_week: input.days_per_week || null,
        total_weeks: input.total_weeks || null,
        status: 'draft',
      })
      .select()
      .single();
    if (error) return { error };
    const mapped = mapProgram(data);
    setPrograms(prev => [mapped, ...prev]);
    return { data: mapped };
  };

  const updateProgram = async (programId: string, updates: Partial<{
    title: string;
    short_description: string;
    long_description: string;
    difficulty: string;
    category_tags: string[];
    equipment_tags: string[];
    visibility: string;
    price_amount: number | null;
    currency: string;
    preview_weeks: number;
    banner_image_url: string | null;
    promo_video_url: string | null;
    manifest: ProgramWeek[];
    days_per_week: number | null;
    total_weeks: number | null;
    status: string;
  }>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const dbUpdates: any = { ...updates };
    if (updates.manifest) dbUpdates.manifest = updates.manifest as any;
    
    const { data, error } = await supabase
      .from('programs')
      .update(dbUpdates)
      .eq('program_id', programId)
      .eq('coach_id', user.id)
      .select()
      .single();
    if (error) return { error };
    const mapped = mapProgram(data);
    setPrograms(prev => prev.map(p => p.program_id === programId ? mapped : p));
    return { data: mapped };
  };

  const publishProgram = async (programId: string) => {
    return updateProgram(programId, { status: 'published' });
  };

  const unpublishProgram = async (programId: string) => {
    return updateProgram(programId, { status: 'draft' });
  };

  const deleteProgram = async (programId: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('program_id', programId)
      .eq('coach_id', user.id);
    if (error) return { error };
    setPrograms(prev => prev.filter(p => p.program_id !== programId));
    return {};
  };

  const duplicateProgram = async (programId: string) => {
    const source = programs.find(p => p.program_id === programId);
    if (!source) return { error: new Error('Program not found') };
    return createProgram({
      title: `${source.title} (Copy)`,
      short_description: source.short_description || undefined,
      long_description: source.long_description || undefined,
      difficulty: source.difficulty,
      category_tags: source.category_tags,
      equipment_tags: source.equipment_tags,
      visibility: source.visibility,
      price_amount: source.price_amount || undefined,
      currency: source.currency || undefined,
      preview_weeks: source.preview_weeks,
      manifest: source.manifest,
      days_per_week: source.days_per_week || undefined,
      total_weeks: source.total_weeks || undefined,
    });
  };

  return {
    programs,
    loading,
    createProgram,
    updateProgram,
    publishProgram,
    unpublishProgram,
    deleteProgram,
    duplicateProgram,
    refetch: fetchPrograms,
  };
}

function mapProgram(row: any): Program {
  return {
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
    status: row.status || 'draft',
    version_number: row.version_number || 1,
    manifest: Array.isArray(row.manifest) ? row.manifest : [],
    days_per_week: row.days_per_week,
    total_weeks: row.total_weeks,
    promo_video_url: row.promo_video_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
  };
}
