import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useNavigate } from 'react-router-dom';
import { useMarketplace } from '@/hooks/useMarketplace';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Users, Award, Star, ArrowLeft, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlowStore } from '@/store/glowStore';
import { useAppMode } from '@/hooks/useAppMode';
import { useCoachingRelationship } from '@/hooks/useCoachingRelationship';
import { supabase } from '@/integrations/supabase/client';

const CATEGORY_CHIPS = ['All', 'Hypertrophy', 'Strength', 'Calisthenics', 'Mobility', 'Full Body', 'Split', 'HIIT', 'Endurance'];
const DIFFICULTY_CHIPS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function Marketplace() {
  const navigate = useNavigate();
  const { programs, loading, filters, setFilters } = useMarketplace();
  const glowEnabled = useGlowStore((s) => s.glowEnabled);
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDifficulty, setActiveDifficulty] = useState('All');
  const { mode } = useAppMode();
  const { relationship, coachProfile: myCoach } = useCoachingRelationship();
  const [coaches, setCoaches] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('coach_profiles')
        .select('user_id, display_name, avatar_url, is_verified, accepts_clients')
        .eq('status', 'active')
        .eq('accepts_clients', true)
        .limit(10);
      if (data) {
        const enriched = await Promise.all(data.map(async (coach: any) => {
          const { count } = await supabase
            .from('programs')
            .select('id', { count: 'exact', head: true })
            .eq('coach_id', coach.user_id)
            .eq('status', 'published');
          return { ...coach, programCount: count || 0 };
        }));
        setCoaches(enriched);
      }
    })();
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput || undefined }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
    setFilters(f => ({ ...f, category: cat === 'All' ? undefined : cat }));
  };

  const handleDifficulty = (diff: string) => {
    setActiveDifficulty(diff);
    setFilters(f => ({ ...f, difficulty: diff === 'All' ? undefined : diff }));
  };

  return (
    <Layout>
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/plan')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Coach Marketplace</h1>
            <p className="text-xs text-muted-foreground">Programs built by coaches. Training run by humans.</p>
          </div>
        </div>

        {/* Client coaching active banner */}
        {mode === 'client' && relationship && myCoach && (
          <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <div className="flex items-center gap-2">
              {myCoach.avatar_url ? (
                <img src={myCoach.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{(myCoach.display_name || '?')[0]}</span>
                </div>
              )}
              <p className="text-sm font-medium">Coached by <span className="text-primary">{myCoach.display_name}</span></p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/messages')}>
              Message
            </Button>
          </div>
        )}

        {/* Coaches strip */}
        {coaches.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-semibold mb-2">Work with a Coach</p>
            <div className="overflow-x-auto scrollbar-none">
              <div className="flex gap-3 pb-1" style={{ width: 'max-content' }}>
                {coaches.map(coach => (
                  <button
                    key={coach.user_id}
                    onClick={() => navigate(`/coach/${coach.user_id}`)}
                    className="flex flex-col items-center gap-1.5 p-2"
                  >
                    <div className="relative">
                      {coach.avatar_url ? (
                        <img src={coach.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-border" loading="lazy" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-border flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">{(coach.display_name || '?')[0]}</span>
                        </div>
                      )}
                      {coach.is_verified && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[8px] text-primary-foreground font-bold">✓</span>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-foreground max-w-[56px] truncate text-center">{coach.display_name}</p>
                    <p className="text-[9px] text-muted-foreground">{coach.programCount} programs</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search programs, coaches, categories..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category chips */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {CATEGORY_CHIPS.map(cat => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer shrink-0 transition-colors"
                onClick={() => handleCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Difficulty filter row */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-1">
            {DIFFICULTY_CHIPS.map(d => (
              <Badge
                key={d}
                variant={activeDifficulty === d ? 'default' : 'secondary'}
                className="cursor-pointer text-[10px] transition-colors"
                onClick={() => handleDifficulty(d)}
              >
                {d}
              </Badge>
            ))}
          </div>
          <Select value={filters.sort || 'newest'} onValueChange={v => setFilters(f => ({ ...f, sort: v as any }))}>
            <SelectTrigger className="w-28 h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="price_low">Price ↑</SelectItem>
              <SelectItem value="price_high">Price ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Programs */}
        {!loading && programs.length === 0 && (
          <Card className="bg-card/60 border-dashed">
            <CardContent className="p-8 text-center">
              <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No programs found. Try different filters.</p>
            </CardContent>
          </Card>
        )}

        {!loading && programs.map(program => (
          <Card
            key={program.program_id}
            className={cn(
              "bg-card/80 cursor-pointer group transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5 overflow-hidden",
              glowEnabled && "card-glow border-glow"
            )}
            onClick={() => navigate(`/marketplace/${program.program_id}`)}
          >
            {/* Banner */}
            {program.banner_image_url && (
              <div className="h-32 w-full overflow-hidden">
                <img
                  src={program.banner_image_url}
                  alt={program.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
            {!program.banner_image_url && (
              <div className="h-24 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Dumbbell className="w-8 h-8 text-primary/40" />
              </div>
            )}

            <CardContent className="p-4 space-y-2">
              {/* Title + Price */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{program.title}</h3>
                <Badge variant={program.visibility === 'paid' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                  {program.visibility === 'paid' ? `$${program.price_amount}` : 'Free'}
                </Badge>
              </div>

              {/* Description */}
              {program.short_description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{program.short_description}</p>
              )}

              {/* Coach */}
              <div className="flex items-center gap-2">
                {program.coach_avatar ? (
                  <img src={program.coach_avatar} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-primary">{(program.coach_name || '?')[0]}</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">{program.coach_name || 'Coach'}</span>
                {program.coach_verified && <Award className="w-3 h-3 text-primary" />}
              </div>

              {/* Metadata row */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{program.difficulty}</span>
                <span>•</span>
                <span>{program.total_weeks || '?'}w</span>
                {program.days_per_week && (
                  <>
                    <span>•</span>
                    <span>{program.days_per_week}d/wk</span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" /> {program.follow_count || 0}
                </span>
              </div>

              {/* Tags */}
              {program.category_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {program.category_tags.slice(0, 3).map(t => (
                    <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                  ))}
                  {program.equipment_tags.slice(0, 2).map(t => (
                    <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
