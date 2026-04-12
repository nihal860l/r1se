import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MeasurementType {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MeasurementLog {
  id: string;
  user_id: string;
  measurement_type_id: string;
  value: number;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export interface TopImprovement {
  typeId: string;
  typeName: string;
  unit: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  changeAbsolute: number;
  direction: 'up' | 'down' | 'same';
}

const LOWER_IS_BETTER_KEYWORDS = ['waist', 'hip', 'fat', 'body fat'];

function isLowerBetter(name: string): boolean {
  const lower = name.toLowerCase();
  return LOWER_IS_BETTER_KEYWORDS.some(kw => lower.includes(kw));
}

export function useBodyMetrics() {
  const { user } = useAuth();
  const [measurementTypes, setMeasurementTypes] = useState<MeasurementType[]>([]);
  const [logs, setLogs] = useState<MeasurementLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      const [typesRes, logsRes] = await Promise.all([
        supabase.from('measurement_types').select('id, user_id, name, unit, display_order, is_active, created_at').eq('user_id', user.id).order('display_order'),
        supabase.from('measurement_logs').select('id, user_id, measurement_type_id, value, logged_at, notes, created_at').eq('user_id', user.id).order('logged_at', { ascending: false }),
      ]);

      if (typesRes.data) setMeasurementTypes(typesRes.data as MeasurementType[]);
      if (logsRes.data) setLogs(logsRes.data as MeasurementLog[]);
    } catch (err) {
      console.error('Error fetching body metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addMeasurementType = useCallback(async (name: string, unit: string) => {
    if (!user) return;
    const maxOrder = measurementTypes.reduce((max, t) => Math.max(max, t.display_order), 0);
    const { data, error } = await supabase.from('measurement_types').insert({
      user_id: user.id, name, unit, display_order: maxOrder + 1,
    }).select().single();
    if (data && !error) setMeasurementTypes(prev => [...prev, data as MeasurementType]);
    return { data, error };
  }, [user, measurementTypes]);

  const deleteMeasurementType = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('measurement_types').delete().eq('id', id);
    setMeasurementTypes(prev => prev.filter(t => t.id !== id));
    setLogs(prev => prev.filter(l => l.measurement_type_id !== id));
  }, [user]);

  const reorderMeasurementTypes = useCallback(async (orderedIds: string[]) => {
    if (!user) return;
    const updates = orderedIds.map((id, i) =>
      supabase.from('measurement_types').update({ display_order: i }).eq('id', id)
    );
    await Promise.all(updates);
    setMeasurementTypes(prev => {
      const map = new Map(prev.map(t => [t.id, t]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, display_order: i }));
    });
  }, [user]);

  const logMeasurement = useCallback(async (typeId: string, value: number, loggedAt?: string, notes?: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('measurement_logs').insert({
      user_id: user.id, measurement_type_id: typeId, value, logged_at: loggedAt || new Date().toISOString(), notes: notes || null,
    }).select().single();
    if (data && !error) setLogs(prev => [data as MeasurementLog, ...prev]);
    return { data, error };
  }, [user]);

  const deleteMeasurementLog = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('measurement_logs').delete().eq('id', id);
    setLogs(prev => prev.filter(l => l.id !== id));
  }, [user]);

  const getLogsForType = useCallback((typeId: string) => {
    return logs.filter(l => l.measurement_type_id === typeId).sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
  }, [logs]);

  const getTopImprovements = useCallback((): TopImprovement[] => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return measurementTypes
      .filter(t => t.is_active)
      .map(type => {
        const typeLogs = logs.filter(l => l.measurement_type_id === type.id).sort((a, b) =>
          new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
        );
        if (typeLogs.length < 2) return null;

        const current = typeLogs[0];
        const previous = typeLogs.find(l => new Date(l.logged_at) <= thirtyDaysAgo) || typeLogs[typeLogs.length - 1];
        if (current.id === previous.id) return null;

        const changeAbsolute = Number(current.value) - Number(previous.value);
        const changePercent = Number(previous.value) !== 0 ? (changeAbsolute / Number(previous.value)) * 100 : 0;

        let direction: 'up' | 'down' | 'same' = 'same';
        if (changeAbsolute > 0) direction = 'up';
        else if (changeAbsolute < 0) direction = 'down';

        return {
          typeId: type.id,
          typeName: type.name,
          unit: type.unit,
          currentValue: Number(current.value),
          previousValue: Number(previous.value),
          changePercent: Math.round(changePercent * 10) / 10,
          changeAbsolute: Math.round(changeAbsolute * 10) / 10,
          direction,
        };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b!.changePercent) - Math.abs(a!.changePercent)) as TopImprovement[];
  }, [measurementTypes, logs]);

  return {
    measurementTypes, logs, loading, addMeasurementType, deleteMeasurementType,
    reorderMeasurementTypes, logMeasurement, deleteMeasurementLog, getLogsForType, getTopImprovements,
    refetch: fetchAll,
  };
}
