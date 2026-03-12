import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { usePrograms, ProgramWeek, ProgramWeekDay } from '@/hooks/usePrograms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Save, Send, Dumbbell, Copy, Infinity, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useGlowStore } from '@/store/glowStore';
import { DayWorkoutEditor } from '@/components/DayWorkoutEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  const existingProgram = editId ? programs.find(p => p.program_id === editId) : null;

  // Metadata
  const [title, setTitle] = useState(existingProgram?.title || '');
  const [shortDesc, setShortDesc] = useState(existingProgram?.short_description || '');
  const [longDesc, setLongDesc] = useState(existingProgram?.long_description || '');
  const [difficulty, setDifficulty] = useState(existingProgram?.difficulty || 'Intermediate');
  const [categoryTags, setCategoryTags] = useState<string[]>(existingProgram?.category_tags || []);
  const [equipmentTags, setEquipmentTags] = useState<string[]>(existingProgram?.equipment_tags || []);
  const [visibility, setVisibility] = useState(existingProgram?.visibility || 'free');
  const [priceAmount, setPriceAmount] = useState(existingProgram?.price_amount?.toString() || '');
  const [previewWeeks, setPreviewWeeks] = useState(existingProgram?.preview_weeks?.toString() || '0');

  // Timeline
  const [weeks, setWeeks] = useState<ProgramWeek[]>(existingProgram?.manifest || []);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [step, setStep] = useState<'metadata' | 'timeline' | 'review'>('metadata');
  const [saving, setSaving] = useState(false);

  // Day editor
  const [editingDay, setEditingDay] = useState<{ weekIdx: number; dayIdx: number } | null>(null);

  // Week settings dialog
  const [weekSettingsIdx, setWeekSettingsIdx] = useState<number | null>(null);
  const [weekSettingsLabel, setWeekSettingsLabel] = useState('');
  const [weekSettingsPhase, setWeekSettingsPhase] = useState('');
  const [weekSettingsInfinite, setWeekSettingsInfinite] = useState(false);

  // Copy week dialog
  const [copyWeekFrom, setCopyWeekFrom] = useState<number | null>(null);
  const [copyWeekTo, setCopyWeekTo] = useState('');

  if (coachLoading || programsLoading) {
    return (
      <Layout hideNav>
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
    const newWeek: ProgramWeek = {
      weekNumber: weekNum,
      label: `Week ${weekNum}`,
      days: DAY_LABELS.map(label => ({ label, workoutName: '', exercises: [] })),
    };
    setWeeks(prev => [...prev, newWeek]);
    setSelectedWeekIdx(weeks.length);
  };

  const removeWeek = (idx: number) => {
    setWeeks(prev => prev.filter((_, i) => i !== idx).map((w, i) => ({
      ...w,
      weekNumber: i + 1,
      label: w.label.startsWith('Week ') ? `Week ${i + 1}` : w.label,
    })));
    if (selectedWeekIdx >= weeks.length - 1) setSelectedWeekIdx(Math.max(0, weeks.length - 2));
  };

  const openWeekSettings = (idx: number) => {
    const w = weeks[idx];
    setWeekSettingsIdx(idx);
    setWeekSettingsLabel(w.label);
    setWeekSettingsPhase(w.phase || '');
    setWeekSettingsInfinite(w.isInfinite || false);
  };

  const saveWeekSettings = () => {
    if (weekSettingsIdx === null) return;
    setWeeks(prev => prev.map((w, i) => i === weekSettingsIdx ? {
      ...w,
      label: weekSettingsLabel || w.label,
      phase: weekSettingsPhase || undefined,
      isInfinite: weekSettingsInfinite,
    } : w));
    setWeekSettingsIdx(null);
  };

  const handleCopyWeek = () => {
    if (copyWeekFrom === null) return;
    const targets = copyWeekTo.split(',').map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n) && n >= 0 && n < weeks.length && n !== copyWeekFrom);
    if (targets.length === 0) { toast.error('Invalid target weeks'); return; }
    const sourceWeek = weeks[copyWeekFrom];
    setWeeks(prev => prev.map((w, i) => {
      if (!targets.includes(i)) return w;
      return { ...w, days: JSON.parse(JSON.stringify(sourceWeek.days)) };
    }));
    toast.success(`Copied to ${targets.length} week(s)`);
    setCopyWeekFrom(null);
    setCopyWeekTo('');
  };

  const updateDayWorkout = (weekIdx: number, dayIdx: number, day: ProgramWeekDay) => {
    setWeeks(prev => prev.map((w, wi) => {
      if (wi !== weekIdx) return w;
      return { ...w, days: w.days.map((d, di) => di === dayIdx ? day : d) };
    }));
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
        days_per_week: weeks.length > 0 ? Math.max(...weeks.map(w => w.days.filter(d => d.exercises.length > 0).length)) : undefined,
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

  const currentWeek = weeks[selectedWeekIdx];

  return (
    <Layout hideNav>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/coach')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{editId ? 'Edit Program' : 'Create Program'}</h1>
            <p className="text-xs text-muted-foreground">
              {step === 'metadata' ? 'Program Details' : step === 'timeline' ? 'Build Timeline' : 'Review & Publish'}
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

        {/* ========== STEP 1: METADATA ========== */}
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
                  <Badge key={tag} variant={categoryTags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer transition-colors" onClick={() => toggleTag(tag, categoryTags, setCategoryTags)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Equipment</Label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map(tag => (
                  <Badge key={tag} variant={equipmentTags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer transition-colors" onClick={() => toggleTag(tag, equipmentTags, setEquipmentTags)}>
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
                <Input type="number" value={priceAmount} onChange={e => setPriceAmount(e.target.value)} placeholder="Price (USD)" min="0" step="0.01" className="mt-2" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Free Preview Weeks</Label>
              <Input type="number" value={previewWeeks} onChange={e => setPreviewWeeks(e.target.value)} min="0" max="52" />
            </div>
            <Button className="w-full" onClick={() => { if (!title.trim()) { toast.error('Title is required'); return; } setStep('timeline'); }}>
              Next: Build Timeline <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ========== STEP 2: TIMELINE ========== */}
        {step === 'timeline' && (
          <div className="space-y-4 animate-fade-in">
            {/* Week pills - horizontal scrollable */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {weeks.map((week, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWeekIdx(idx)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                    selectedWeekIdx === idx
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {week.isInfinite && <Infinity className="w-3 h-3" />}
                  {week.phase ? `${week.phase}` : week.label}
                  {week.rangeEnd && week.rangeEnd > week.weekNumber ? `–${week.rangeEnd}` : ''}
                </button>
              ))}
              <button
                onClick={addWeek}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Week
              </button>
            </div>

            {/* Current week controls */}
            {currentWeek && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-sm">
                      {currentWeek.phase ? `${currentWeek.phase} · ` : ''}{currentWeek.label}
                      {currentWeek.isInfinite && <span className="ml-1 text-primary">∞</span>}
                    </h2>
                    <p className="text-[10px] text-muted-foreground">
                      {currentWeek.days.filter(d => d.exercises.length > 0).length} active days
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Pencil className="w-3 h-3 mr-1" /> Options
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openWeekSettings(selectedWeekIdx)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Rename / Phase
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setCopyWeekFrom(selectedWeekIdx); setCopyWeekTo(''); }}>
                          <Copy className="w-3.5 h-3.5 mr-2" /> Copy to weeks...
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => removeWeek(selectedWeekIdx)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Week
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Day cards */}
                <div className="space-y-2">
                  {currentWeek.days.map((day, dayIdx) => {
                    const hasWorkout = day.exercises.length > 0;
                    const totalSets = day.exercises.reduce((s, e) => s + e.sets.length, 0);
                    return (
                      <Card
                        key={dayIdx}
                        className={cn(
                          "cursor-pointer transition-all hover:ring-1 hover:ring-primary/30",
                          hasWorkout ? "bg-card/80" : "bg-card/40 border-dashed",
                          glowEnabled && hasWorkout && "card-glow"
                        )}
                        onClick={() => setEditingDay({ weekIdx: selectedWeekIdx, dayIdx })}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                              hasWorkout ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {day.label.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{day.label}</p>
                              {hasWorkout ? (
                                <p className="text-[11px] text-muted-foreground">
                                  {day.workoutName && <span className="text-foreground font-medium">{day.workoutName} · </span>}
                                  {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''}
                                </p>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">Tap to add workout</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {hasWorkout && (
                              <div className="flex -space-x-1">
                                {day.exercises.slice(0, 3).map((_, i) => (
                                  <div key={i} className="w-4 h-4 rounded-full bg-primary/20 border border-background flex items-center justify-center">
                                    <Dumbbell className="w-2 h-2 text-primary" />
                                  </div>
                                ))}
                                {day.exercises.length > 3 && (
                                  <div className="w-4 h-4 rounded-full bg-muted border border-background flex items-center justify-center">
                                    <span className="text-[7px] text-muted-foreground">+{day.exercises.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {weeks.length === 0 && (
              <Card className="bg-card/60 border-dashed">
                <CardContent className="p-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">No weeks yet. Add your first week to start building.</p>
                  <Button variant="outline" onClick={addWeek}>
                    <Plus className="w-4 h-4 mr-2" /> Add Week 1
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('metadata')}>Back</Button>
              <Button className="flex-1" onClick={() => setStep('review')}>
                Next: Review <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ========== STEP 3: REVIEW ========== */}
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
                  <p className="text-xs font-semibold mb-1">
                    {week.phase ? `${week.phase} · ` : ''}{week.label}
                    {week.isInfinite && ' ∞'}
                  </p>
                  {week.days.filter(d => d.exercises.length > 0).map((day, di) => (
                    <div key={di} className="ml-2 mb-1">
                      <p className="text-[11px] text-muted-foreground">
                        {day.label}{day.workoutName ? ` — ${day.workoutName}` : ''}: {day.exercises.length} exercises, {day.exercises.reduce((s, e) => s + e.sets.length, 0)} sets
                      </p>
                    </div>
                  ))}
                  {week.days.filter(d => d.exercises.length > 0).length === 0 && (
                    <p className="text-[11px] text-muted-foreground ml-2 italic">No workouts</p>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('timeline')}>Back</Button>
              <Button variant="outline" className="flex-1" onClick={() => handleSave(false)} disabled={saving}>
                <Save className="w-4 h-4 mr-2" /> {saving ? '...' : 'Draft'}
              </Button>
              <Button className="flex-1" onClick={() => handleSave(true)} disabled={saving}>
                <Send className="w-4 h-4 mr-2" /> {saving ? '...' : 'Publish'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Day Workout Editor - reuses exact same workout creation UX */}
      {editingDay && currentWeek && (
        <DayWorkoutEditor
          open={true}
          onOpenChange={(open) => { if (!open) setEditingDay(null); }}
          day={currentWeek.days[editingDay.dayIdx]}
          dayLabel={currentWeek.days[editingDay.dayIdx].label}
          onSave={(updatedDay) => {
            updateDayWorkout(editingDay.weekIdx, editingDay.dayIdx, updatedDay);
            setEditingDay(null);
          }}
        />
      )}

      {/* Week Settings Dialog */}
      <Dialog open={weekSettingsIdx !== null} onOpenChange={() => setWeekSettingsIdx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Week Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Week Label</Label>
              <Input value={weekSettingsLabel} onChange={e => setWeekSettingsLabel(e.target.value)} placeholder="Week 1" />
            </div>
            <div className="space-y-2">
              <Label>Phase (optional)</Label>
              <Input value={weekSettingsPhase} onChange={e => setWeekSettingsPhase(e.target.value)} placeholder="e.g. Hypertrophy, Strength, Deload" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Infinite / Ongoing</Label>
                <p className="text-[11px] text-muted-foreground">Marks this week as repeating indefinitely</p>
              </div>
              <Switch checked={weekSettingsInfinite} onCheckedChange={setWeekSettingsInfinite} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveWeekSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Week Dialog */}
      <Dialog open={copyWeekFrom !== null} onOpenChange={() => setCopyWeekFrom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Week {copyWeekFrom !== null ? copyWeekFrom + 1 : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy all day workouts from Week {copyWeekFrom !== null ? copyWeekFrom + 1 : ''} to other weeks.
            </p>
            <div className="space-y-2">
              <Label>Target weeks (comma separated)</Label>
              <Input
                value={copyWeekTo}
                onChange={e => setCopyWeekTo(e.target.value)}
                placeholder={`e.g. 2, 3, 4`}
              />
              <p className="text-[10px] text-muted-foreground">Available: {weeks.map((_, i) => i + 1).filter(n => n !== (copyWeekFrom !== null ? copyWeekFrom + 1 : -1)).join(', ')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCopyWeek}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
