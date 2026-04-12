import { useState, useMemo, useCallback, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { useWorkoutStore } from '@/store/workoutStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { TrendingUp, ChevronDown, X, Search, Camera, Plus, Trash2, CheckSquare, Square, EyeOff, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { exercises as defaultExercises } from '@/data/exercises';
import { useGlowStore } from '@/store/glowStore';
import { useBodyMetrics, MeasurementType } from '@/hooks/useBodyMetrics';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { useAppMode } from '@/hooks/useAppMode';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';

const CHART_COLORS = [
  'hsl(189, 100%, 51%)',
  'hsl(200, 80%, 55%)',
  'hsl(45, 90%, 55%)',
  'hsl(330, 70%, 55%)',
  'hsl(270, 60%, 60%)',
];

const MEASUREMENT_SUGGESTIONS = [
  { name: 'Body Weight', unit: 'kg' },
  { name: 'Body Fat %', unit: '%' },
  { name: 'Waist', unit: 'cm' },
  { name: 'Chest', unit: 'cm' },
  { name: 'Left Bicep', unit: 'cm' },
  { name: 'Right Bicep', unit: 'cm' },
  { name: 'Shoulders', unit: 'cm' },
  { name: 'Hips', unit: 'cm' },
  { name: 'Left Thigh', unit: 'cm' },
  { name: 'Right Thigh', unit: 'cm' },
  { name: 'Left Calf', unit: 'cm' },
  { name: 'Right Calf', unit: 'cm' },
  { name: 'Neck', unit: 'cm' },
  { name: 'Forearm', unit: 'cm' },
];

interface DataPoint {
  date: string;
  dateLabel: string;
  [key: string]: number | string;
}

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const h = 24; const w = 60;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const Progress = () => {
  const workoutLogs = useWorkoutStore((s) => s.workoutLogs);
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const { mode } = useAppMode();
  const {
    measurementTypes, logs: measurementLogs, loading: metricsLoading,
    addMeasurementType, deleteMeasurementType, logMeasurement, getLogsForType,
  } = useBodyMetrics();
  const { photos, loading: photosLoading, uploadPhoto, deletePhotos, toggleCoachVisibility } = useProgressPhotos();

  const [activeTab, setActiveTab] = useState('strength');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [metric, setMetric] = useState<'estimated1rm' | 'volume'>('estimated1rm');
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [logValues, setLogValues] = useState<Record<string, string>>({});
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('cm');
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ─── STRENGTH TAB (existing logic) ───
  const exerciseMap = useMemo(() => {
    const map = new Map<string, string>();
    defaultExercises.forEach((e) => map.set(e.id, e.name));
    customExercises.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [customExercises]);

  const exercisesInHistory = useMemo(() => {
    const ids = new Set<string>();
    workoutLogs.forEach((log) => { log.exercises.forEach((ex) => ids.add(ex.exerciseId)); });
    return Array.from(ids).map((id) => ({ id, name: exerciseMap.get(id) || id })).sort((a, b) => a.name.localeCompare(b.name));
  }, [workoutLogs, exerciseMap]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercisesInHistory;
    const q = searchQuery.toLowerCase();
    return exercisesInHistory.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercisesInHistory, searchQuery]);

  const estimated1RM = (weight: number, reps: number) => {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  };

  const chartData = useMemo(() => {
    if (selectedExerciseIds.length === 0) return [];
    const exerciseDateMap = new Map<string, Map<string, { best1rm: number; totalVolume: number }>>();
    selectedExerciseIds.forEach((exId) => exerciseDateMap.set(exId, new Map()));
    workoutLogs.slice().sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .forEach((log) => {
        const dateKey = format(new Date(log.completedAt), 'yyyy-MM-dd');
        log.exercises.forEach((ex) => {
          if (!selectedExerciseIds.includes(ex.exerciseId)) return;
          const map = exerciseDateMap.get(ex.exerciseId)!;
          const existing = map.get(dateKey) || { best1rm: 0, totalVolume: 0 };
          ex.sets.forEach((set) => {
            const w = set.weight || 0; const r = set.reps || 0;
            const e1rm = estimated1RM(w, r);
            if (e1rm > existing.best1rm) existing.best1rm = e1rm;
            existing.totalVolume += w * r;
          });
          map.set(dateKey, existing);
        });
      });
    const allDates = new Set<string>();
    exerciseDateMap.forEach((dateMap) => dateMap.forEach((_, d) => allDates.add(d)));
    return Array.from(allDates).sort().map((date) => {
      const point: DataPoint = { date, dateLabel: format(new Date(date), 'MMM d') };
      selectedExerciseIds.forEach((exId) => {
        const name = exerciseMap.get(exId) || exId;
        const data = exerciseDateMap.get(exId)!.get(date);
        point[name] = metric === 'estimated1rm' ? (data ? Math.round(data.best1rm * 10) / 10 : 0) : (data ? data.totalVolume : 0);
      });
      return point;
    }).filter((point) => selectedExerciseIds.some((exId) => { const name = exerciseMap.get(exId) || exId; return (point[name] as number) > 0; }));
  }, [workoutLogs, selectedExerciseIds, exerciseMap, metric]);

  const toggleExercise = (id: string) => setSelectedExerciseIds((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  const removeExercise = (id: string) => setSelectedExerciseIds((prev) => prev.filter((e) => e !== id));

  // ─── BODY TAB ───
  const existingTypeNames = new Set(measurementTypes.map(t => t.name));
  const availableSuggestions = MEASUREMENT_SUGGESTIONS.filter(s => !existingTypeNames.has(s.name));

  const handleAddSuggestion = async (name: string, unit: string) => {
    await addMeasurementType(name, unit);
  };

  const handleSaveLog = async () => {
    const entries = Object.entries(logValues).filter(([, v]) => v.trim() !== '');
    for (const [typeId, value] of entries) {
      await logMeasurement(typeId, parseFloat(value));
    }
    setLogValues({});
    setShowLogSheet(false);
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;
    await addMeasurementType(customName.trim(), customUnit);
    setCustomName('');
    setCustomUnit('cm');
    setShowCustomDialog(false);
  };

  // ─── PHOTOS TAB ───
  const togglePhotoSelect = (id: string) => {
    setSelectedPhotoIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleDeletePhotos = async () => {
    await deletePhotos(selectedPhotoIds);
    setSelectedPhotoIds([]);
    setMultiSelect(false);
    setShowDeleteConfirm(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhoto(file);
  };

  // Body weight chart data
  const bodyWeightType = measurementTypes.find(t => t.name.toLowerCase() === 'body weight');
  const bodyWeightChartData = useMemo(() => {
    if (!bodyWeightType) return [];
    return getLogsForType(bodyWeightType.id).map(l => ({
      date: format(new Date(l.logged_at), 'MMM d'),
      value: Number(l.value),
    }));
  }, [bodyWeightType, getLogsForType]);

  return (
    <Layout>
      <div className="container max-w-lg animate-fade-in px-4">
        <div className="pt-6 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Progress</h2>
          <p className="text-sm text-muted-foreground">Track your journey</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="strength" className="flex-1">Strength</TabsTrigger>
            <TabsTrigger value="body" className="flex-1">Body</TabsTrigger>
            <TabsTrigger value="photos" className="flex-1">Photos</TabsTrigger>
          </TabsList>

          {/* ─── STRENGTH TAB ─── */}
          <TabsContent value="strength" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-between h-11" onClick={() => setShowPicker(!showPicker)}>
                <span className="text-foreground">{selectedExerciseIds.length === 0 ? 'Select exercises to track...' : `${selectedExerciseIds.length} exercise${selectedExerciseIds.length > 1 ? 's' : ''} selected`}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showPicker && "rotate-180")} />
              </Button>

              {showPicker && (
                <Card className={cn(glowEnabled && "card-glow border-glow")}>
                  <CardContent className="p-3 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search exercises..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredExercises.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No exercises found in your history</p>
                      ) : filteredExercises.map((ex) => (
                        <button key={ex.id} onClick={() => toggleExercise(ex.id)}
                          className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                            selectedExerciseIds.includes(ex.id) ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-muted text-foreground')}>
                          {ex.name}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedExerciseIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedExerciseIds.map((id, i) => (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1 rounded-lg" style={{ borderColor: CHART_COLORS[i % CHART_COLORS.length], borderWidth: 1 }}>
                      <span className="text-xs">{exerciseMap.get(id) || id}</span>
                      <button onClick={() => removeExercise(id)} className="ml-1 rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {selectedExerciseIds.length > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant={metric === 'estimated1rm' ? 'default' : 'outline'} onClick={() => setMetric('estimated1rm')} className="text-xs rounded-lg">Est. 1RM</Button>
                <Button size="sm" variant={metric === 'volume' ? 'default' : 'outline'} onClick={() => setMetric('volume')} className="text-xs rounded-lg">Volume</Button>
              </div>
            )}

            {selectedExerciseIds.length > 0 ? (
              chartData.length > 0 ? (
                <Card className={cn(glowEnabled && "card-glow border-glow")}>
                  <CardContent className="p-3 pt-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                        {selectedExerciseIds.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
                        {selectedExerciseIds.map((exId, i) => (
                          <Line key={exId} type="monotone" dataKey={exerciseMap.get(exId) || exId} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
                            dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }} activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }} connectNulls={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="py-12 text-center"><TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No history data found</p></CardContent></Card>
              )
            ) : (
              <Card className={cn(glowEnabled && "card-glow border-glow")}>
                <CardContent className="py-16 text-center">
                  <div className={cn("w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4")}>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-foreground font-bold mb-1">Track Your Progress</p>
                  <p className="text-sm text-muted-foreground">Select exercises above to see your strength progression</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── BODY TAB ─── */}
          <TabsContent value="body" className="space-y-4 mt-4">
            <Button className="w-full" onClick={() => { setLogValues({}); setShowLogSheet(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Log Today
            </Button>

            {/* Body Weight Chart */}
            {bodyWeightType && bodyWeightChartData.length > 1 && (
              <Card className={cn(glowEnabled && "card-glow border-glow")}>
                <CardContent className="p-3 pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Body Weight</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={bodyWeightChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Measurement Cards */}
            {measurementTypes.filter(t => t.is_active).map(type => {
              const typeLogs = getLogsForType(type.id);
              const latest = typeLogs.length > 0 ? typeLogs[typeLogs.length - 1] : null;
              const prev = typeLogs.length > 1 ? typeLogs[typeLogs.length - 2] : null;
              const change = latest && prev ? Number(latest.value) - Number(prev.value) : null;
              const expanded = expandedType === type.id;

              return (
                <Card key={type.id} className={cn("cursor-pointer transition-all duration-200", glowEnabled && "card-glow")} onClick={() => setExpandedType(expanded ? null : type.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{type.name} <span className="text-muted-foreground text-xs">({type.unit})</span></p>
                        <p className="text-2xl font-bold mt-1">{latest ? Number(latest.value).toFixed(1) : '—'}</p>
                        {change !== null && (
                          <p className={cn("text-xs font-medium", change !== 0 ? "text-primary" : "text-muted-foreground")}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)} {type.unit}
                          </p>
                        )}
                      </div>
                      <MiniSparkline values={typeLogs.slice(-8).map(l => Number(l.value))} />
                    </div>
                    {expanded && typeLogs.length > 1 && (
                      <div className="mt-4">
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={typeLogs.map(l => ({ date: format(new Date(l.logged_at), 'MMM d'), value: Number(l.value) }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Suggestions */}
            {availableSuggestions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Add Measurements</p>
                <div className="overflow-x-auto scrollbar-none">
                  <div className="flex gap-2 pb-2">
                    {availableSuggestions.map(s => (
                      <button key={s.name} onClick={() => handleAddSuggestion(s.name, s.unit)}
                        className="shrink-0 px-3 py-1.5 rounded-full border border-border text-sm hover:border-primary/30 hover:bg-primary/5 transition-colors">
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setShowCustomDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Custom
            </Button>
          </TabsContent>

          {/* ─── PHOTOS TAB ─── */}
          <TabsContent value="photos" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMultiSelect(!multiSelect); setSelectedPhotoIds([]); }}>
                  {multiSelect ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={() => photoInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-1" /> Upload
                </Button>
              </div>
            </div>

            {photos.length === 0 ? (
              <Card><CardContent className="py-16 text-center">
                <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">No progress photos yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Your transformation has to start somewhere.</p>
                <Button className="mt-4" onClick={() => photoInputRef.current?.click()}>Take Your First Photo</Button>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map(photo => (
                  <button key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-secondary"
                    onClick={() => multiSelect ? togglePhotoSelect(photo.id) : undefined}
                    onContextMenu={(e) => { e.preventDefault(); if (!multiSelect) { setMultiSelect(true); setSelectedPhotoIds([photo.id]); } }}>
                    <img src={photo.thumbnailUrl || photo.signedUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {multiSelect && (
                      <div className="absolute top-1 left-1">
                        {selectedPhotoIds.includes(photo.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-foreground/60" />}
                      </div>
                    )}
                    <p className="absolute bottom-0 left-0 right-0 bg-background/60 text-[10px] text-muted-foreground text-center py-0.5">
                      {format(new Date(photo.taken_at), 'MMM d')}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {multiSelect && selectedPhotoIds.length > 0 && (
              <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
                <div className="container max-w-lg mx-auto bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{selectedPhotoIds.length} selected</span>
                  <div className="flex gap-2">
                    {mode === 'client' && (
                      <Button size="sm" variant="outline" onClick={() => toggleCoachVisibility(selectedPhotoIds, false)}>
                        <EyeOff className="w-3 h-3 mr-1" /> Hide
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Measurement Log Sheet */}
      <Sheet open={showLogSheet} onOpenChange={setShowLogSheet}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Log Measurements</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4 pb-[env(safe-area-inset-bottom)]">
            {measurementTypes.filter(t => t.is_active).map(type => {
              const typeLogs = getLogsForType(type.id);
              const lastValue = typeLogs.length > 0 ? Number(typeLogs[typeLogs.length - 1].value).toFixed(1) : '';
              return (
                <div key={type.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{type.name}</p>
                    <p className="text-[10px] text-muted-foreground">{type.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => setLogValues(prev => ({ ...prev, [type.id]: String(Math.max(0, parseFloat(prev[type.id] || lastValue || '0') - (type.unit === 'kg' ? 0.5 : 0.5))) }))}>
                      <span className="text-lg">−</span>
                    </Button>
                    <Input
                      type="number" inputMode="decimal" className="w-20 text-center h-10"
                      placeholder={lastValue} value={logValues[type.id] || ''}
                      onChange={(e) => setLogValues(prev => ({ ...prev, [type.id]: e.target.value }))}
                    />
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => setLogValues(prev => ({ ...prev, [type.id]: String(parseFloat(prev[type.id] || lastValue || '0') + (type.unit === 'kg' ? 0.5 : 0.5)) }))}>
                      <span className="text-lg">+</span>
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button className="w-full" disabled={!Object.values(logValues).some(v => v.trim())} onClick={handleSaveLog}>
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Custom Measurement Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Custom Measurement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Measurement name" value={customName} onChange={e => setCustomName(e.target.value)} />
            <div className="flex gap-2 flex-wrap">
              {['kg', 'lbs', 'cm', 'in', 'mm', '%'].map(u => (
                <Badge key={u} variant={customUnit === u ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCustomUnit(u)}>{u}</Badge>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateCustom} disabled={!customName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPhotoIds.length} photo{selectedPhotoIds.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePhotos} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Progress;
