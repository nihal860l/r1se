import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { usePrograms, ProgramWeek, ProgramWeekDay, ProgramExercise, ProgramSet } from '@/hooks/usePrograms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Save, Send, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useGlowStore } from '@/store/glowStore';
import { DEFAULT_EXERCISES } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const CATEGORY_OPTIONS = ['Hypertrophy', 'Strength', 'Calisthenics', 'Mobility', 'Full Body', 'Split', 'HIIT', 'Endurance'];
const EQUIPMENT_OPTIONS = ['Gym', 'Bodyweight', 'Home', 'Dumbbells', 'Bands', 'Kettlebell'];
const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProgramBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { isCoach, loading: coachLoading } = useCoachProfile();
  const { programs, createProgram, updateProgram, publishProgram, loading: programsLoading } = usePrograms();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const customExercises = useWorkoutStore((s) => s.customExercises);

  const existingProgram = editId ? programs.find(p => p.program_id === editId) : null;

  // Metadata state
  const [title, setTitle] = useState(existingProgram?.title || '');
  const [shortDesc, setShortDesc] = useState(existingProgram?.short_description || '');
  const [longDesc, setLongDesc] = useState(existingProgram?.long_description || '');
  const [difficulty, setDifficulty] = useState(existingProgram?.difficulty || 'Intermediate');
  const [categoryTags, setCategoryTags] = useState<string[]>(existingProgram?.category_tags || []);
  const [equipmentTags, setEquipmentTags] = useState<string[]>(existingProgram?.equipment_tags || []);
  const [visibility, setVisibility] = useState(existingProgram?.visibility || 'free');
  const [priceAmount, setPriceAmount] = useState(existingProgram?.price_amount?.toString() || '');
  const [previewWeeks, setPreviewWeeks] = useState(existingProgram?.preview_weeks?.toString() || '0');

  // Timeline state
  const [weeks, setWeeks] = useState<ProgramWeek[]>(existingProgram?.manifest || []);
  const [step, setStep] = useState<'metadata' | 'timeline' | 'review'>('metadata');
  const [saving, setSaving] = useState(false);

  // Expanded state
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([0]));
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const allExercises = [...DEFAULT_EXERCISES, ...customExercises];

  if (coachLoading || programsLoading) {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto px-4 py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isCoach) {
    navigate('/');
    return null;
  }

  const toggleTag = (tag: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]);
  };

  const addWeek = () => {
    const weekNum = weeks.length + 1;
    setWeeks([...weeks, {
      weekNumber: weekNum,
      label: `Week ${weekNum}`,
      days: [{ label: 'Monday', workoutName: '', exercises: [] }],
    }]);
    setExpandedWeeks(prev => new Set([...prev, weeks.length]));
  };

  const removeWeek = (idx: number) => {
    setWeeks(weeks.filter((_, i) => i !== idx).map((w, i) => ({ ...w, weekNumber: i + 1, label: `Week ${i + 1}` })));
  };

  const addDay = (weekIdx: number) => {
    const updated = [...weeks];
    const usedLabels = updated[weekIdx].days.map(d => d.label);
    const nextLabel = DAY_LABELS.find(l => !usedLabels.includes(l)) || `Day ${updated[weekIdx].days.length + 1}`;
    updated[weekIdx].days.push({ label: nextLabel, workoutName: '', exercises: [] });
    setWeeks(updated);
  };

  const removeDay = (weekIdx: number, dayIdx: number) => {
    const updated = [...weeks];
    updated[weekIdx].days = updated[weekIdx].days.filter((_, i) => i !== dayIdx);
    setWeeks(updated);
  };

  const updateDay = (weekIdx: number, dayIdx: number, updates: Partial<ProgramWeekDay>) => {
    const updated = [...weeks];
    updated[weekIdx].days[dayIdx] = { ...updated[weekIdx].days[dayIdx], ...updates };
    setWeeks(updated);
  };

  const addExercise = (weekIdx: number, dayIdx: number, exercise: { id: string; name: string }) => {
    const updated = [...weeks];
    updated[weekIdx].days[dayIdx].exercises.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [{ targetReps: 10, targetWeight: undefined, intensity: undefined, setType: 'normal' }],
    });
    setWeeks(updated);
  };

  const removeExercise = (weekIdx: number, dayIdx: number, exIdx: number) => {
    const updated = [...weeks];
    updated[weekIdx].days[dayIdx].exercises = updated[weekIdx].days[dayIdx].exercises.filter((_, i) => i !== exIdx);
    setWeeks(updated);
  };

  const addSet = (weekIdx: number, dayIdx: number, exIdx: number) => {
    const updated = [...weeks];
    updated[weekIdx].days[dayIdx].exercises[exIdx].sets.push({ targetReps: 10 });
    setWeeks(updated);
  };

  const removeSet = (weekIdx: number, dayIdx: number, exIdx: number, setIdx: number) => {
    const updated = [...weeks];
    updated[weekIdx].days[dayIdx].exercises[exIdx].sets = updated[weekIdx].days[dayIdx].exercises[exIdx].sets.filter((_, i) => i !== setIdx);
    setWeeks(updated);
  };

  const updateSet = (weekIdx: number, dayIdx: number, exIdx: number, setIdx: number, updates: Partial<ProgramSet>) => {
    const updated = [...weeks];
    updated[weekIdx].days[dayIdx].exercises[exIdx].sets[setIdx] = {
      ...updated[weekIdx].days[dayIdx].exercises[exIdx].sets[setIdx],
      ...updates,
    };
    setWeeks(updated);
  };

  const handleSave = async (publish = false) => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        short_description: shortDesc.trim() || undefined,
        long_description: longDesc.trim() || undefined,
        difficulty,
        category_tags: categoryTags,
        equipment_tags: equipmentTags,
        visibility,
        price_amount: visibility === 'paid' ? parseFloat(priceAmount) || 0 : undefined,
        preview_weeks: parseInt(previewWeeks) || 0,
        manifest: weeks,
        total_weeks: weeks.length || undefined,
        days_per_week: weeks.length > 0 ? Math.max(...weeks.map(w => w.days.length)) : undefined,
      };

      if (editId && existingProgram) {
        const res = await updateProgram(editId, payload);
        if (res.error) throw res.error;
        if (publish) {
          const pubRes = await publishProgram(editId);
          if (pubRes.error) throw pubRes.error;
          toast.success('Program published!');
        } else {
          toast.success('Program saved!');
        }
      } else {
        const res = await createProgram(payload);
        if (res.error) throw res.error;
        if (publish && res.data) {
          const pubRes = await publishProgram(res.data.program_id);
          if (pubRes.error) throw pubRes.error;
          toast.success('Program published!');
        } else {
          toast.success('Draft saved!');
        }
      }
      navigate('/coach');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeek = (idx: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleDay = (key: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <Layout hideNav>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/coach')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{editId ? 'Edit Program' : 'Create Program'}</h1>
            <p className="text-xs text-muted-foreground">
              {step === 'metadata' ? 'Step 1: Details' : step === 'timeline' ? 'Step 2: Timeline' : 'Step 3: Review'}
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1">
          {['metadata', 'timeline', 'review'].map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step === s ? "bg-primary" : i < ['metadata', 'timeline', 'review'].indexOf(step) ? "bg-primary/50" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step 1: Metadata */}
        {step === 'metadata' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 12-Week Hypertrophy Program" />
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input value={shortDesc} onChange={e => setShortDesc(e.target.value)} placeholder="Brief one-liner" maxLength={120} />
            </div>

            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea value={longDesc} onChange={e => setLongDesc(e.target.value)} placeholder="Detailed program description..." rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map(tag => (
                  <Badge
                    key={tag}
                    variant={categoryTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleTag(tag, categoryTags, setCategoryTags)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Equipment</Label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map(tag => (
                  <Badge
                    key={tag}
                    variant={equipmentTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleTag(tag, equipmentTags, setEquipmentTags)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pricing</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              {visibility === 'paid' && (
                <Input
                  type="number"
                  value={priceAmount}
                  onChange={e => setPriceAmount(e.target.value)}
                  placeholder="Price (USD)"
                  min="0"
                  step="0.01"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Free Preview Weeks</Label>
              <Input
                type="number"
                value={previewWeeks}
                onChange={e => setPreviewWeeks(e.target.value)}
                min="0"
                max="52"
              />
            </div>

            <Button className="w-full" onClick={() => {
              if (!title.trim()) { toast.error('Title is required'); return; }
              setStep('timeline');
            }}>
              Next: Build Timeline
            </Button>
          </div>
        )}

        {/* Step 2: Timeline */}
        {step === 'timeline' && (
          <div className="space-y-3 animate-fade-in">
            {weeks.length === 0 && (
              <Card className="bg-card/60 border-dashed">
                <CardContent className="p-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">No weeks yet. Add your first week to start building.</p>
                  <Button variant="outline" onClick={addWeek}>
                    <Plus className="w-4 h-4 mr-2" /> Add Week 1
                  </Button>
                </CardContent>
              </Card>
            )}

            {weeks.map((week, wi) => (
              <Card key={wi} className={cn("bg-card/80", glowEnabled && "card-glow")}>
                <CardContent className="p-0">
                  {/* Week header */}
                  <button
                    className="w-full flex items-center justify-between p-4"
                    onClick={() => toggleWeek(wi)}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{week.label}</span>
                      <Badge variant="secondary" className="text-[10px]">{week.days.length} days</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); removeWeek(wi); }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                      {expandedWeeks.has(wi) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>

                  {expandedWeeks.has(wi) && (
                    <div className="px-4 pb-4 space-y-2">
                      {week.days.map((day, di) => {
                        const dayKey = `${wi}-${di}`;
                        return (
                          <Card key={di} className="bg-muted/30">
                            <CardContent className="p-0">
                              <button
                                className="w-full flex items-center justify-between p-3"
                                onClick={() => toggleDay(dayKey)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium">{day.label}</span>
                                  {day.workoutName && <span className="text-xs text-muted-foreground">– {day.workoutName}</span>}
                                  <Badge variant="outline" className="text-[9px]">{day.exercises.length} ex</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); removeDay(wi, di); }}>
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                  {expandedDays.has(dayKey) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </div>
                              </button>

                              {expandedDays.has(dayKey) && (
                                <div className="px-3 pb-3 space-y-2">
                                  <Input
                                    placeholder="Workout name (e.g. Push Day)"
                                    value={day.workoutName}
                                    onChange={e => updateDay(wi, di, { workoutName: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                  <Select value={day.label} onValueChange={v => updateDay(wi, di, { label: v })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {DAY_LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                    </SelectContent>
                                  </Select>

                                  {/* Exercises */}
                                  {day.exercises.map((ex, ei) => (
                                    <Card key={ei} className="bg-background/50">
                                      <CardContent className="p-2 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <Dumbbell className="w-3 h-3 text-primary" />
                                            <span className="text-xs font-medium">{ex.exerciseName}</span>
                                          </div>
                                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeExercise(wi, di, ei)}>
                                            <Trash2 className="w-2.5 h-2.5 text-destructive" />
                                          </Button>
                                        </div>
                                        {/* Sets */}
                                        {ex.sets.map((set, si) => (
                                          <div key={si} className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-muted-foreground w-4">S{si + 1}</span>
                                            <Input
                                              type="number"
                                              placeholder="Reps"
                                              value={set.targetReps || ''}
                                              onChange={e => updateSet(wi, di, ei, si, { targetReps: parseInt(e.target.value) || undefined })}
                                              className="h-6 text-[10px] w-16"
                                            />
                                            <Input
                                              type="number"
                                              placeholder="Kg"
                                              value={set.targetWeight || ''}
                                              onChange={e => updateSet(wi, di, ei, si, { targetWeight: parseFloat(e.target.value) || undefined })}
                                              className="h-6 text-[10px] w-16"
                                            />
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeSet(wi, di, ei, si)}>
                                              <Trash2 className="w-2 h-2 text-muted-foreground" />
                                            </Button>
                                          </div>
                                        ))}
                                        <Button variant="ghost" size="sm" className="h-5 text-[10px] w-full" onClick={() => addSet(wi, di, ei)}>
                                          <Plus className="w-2.5 h-2.5 mr-1" /> Add Set
                                        </Button>
                                      </CardContent>
                                    </Card>
                                  ))}

                                  {/* Add exercise picker */}
                                  <ExercisePicker
                                    exercises={allExercises}
                                    onSelect={(ex) => addExercise(wi, di, ex)}
                                  />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}

                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => addDay(wi)}>
                        <Plus className="w-3 h-3 mr-1" /> Add Day
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full" onClick={addWeek}>
              <Plus className="w-4 h-4 mr-2" /> Add Week
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('metadata')}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep('review')}>
                Next: Review
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="space-y-4 animate-fade-in">
            <Card className="bg-card/80">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-bold">{title || 'Untitled'}</h3>
                {shortDesc && <p className="text-sm text-muted-foreground">{shortDesc}</p>}
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{difficulty}</Badge>
                  <Badge variant="outline">{visibility === 'paid' ? `$${priceAmount}` : 'Free'}</Badge>
                  {categoryTags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  {equipmentTags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                </div>
                <p className="text-xs text-muted-foreground">{weeks.length} weeks • Preview: {previewWeeks} weeks</p>
              </CardContent>
            </Card>

            {weeks.map((week, wi) => (
              <Card key={wi} className="bg-card/60">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold mb-1">{week.label}</p>
                  {week.days.map((day, di) => (
                    <div key={di} className="ml-2 mb-1">
                      <p className="text-[11px] text-muted-foreground">
                        {day.label}{day.workoutName ? ` — ${day.workoutName}` : ''}: {day.exercises.length} exercises, {day.exercises.reduce((s, e) => s + e.sets.length, 0)} sets
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('timeline')}>
                Back
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleSave(false)} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button className="flex-1" onClick={() => handleSave(true)} disabled={saving}>
                <Send className="w-4 h-4 mr-2" />
                {saving ? '...' : 'Publish'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Exercise picker sub-component
function ExercisePicker({ exercises, onSelect }: { exercises: any[]; onSelect: (ex: { id: string; name: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30)
    : exercises.slice(0, 30);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add Exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2"
          autoFocus
        />
        <div className="overflow-y-auto flex-1 space-y-1">
          {filtered.map(ex => (
            <button
              key={ex.id}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors flex items-center gap-2"
              onClick={() => { onSelect({ id: ex.id, name: ex.name }); setOpen(false); setSearch(''); }}
            >
              <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{ex.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{ex.muscleGroup}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No exercises found</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
