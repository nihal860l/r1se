import Fuse, { FuseResult, IFuseOptions } from 'fuse.js';
import { Exercise } from '@/types/workout';
import { useState, useMemo, useEffect } from 'react';

const SYNONYMS: Record<string, string[]> = {
  bicep: ['biceps'],
  biceps: ['bicep'],
  tricep: ['triceps'],
  triceps: ['tricep'],
  abs: ['abdominals', 'core', 'abdominal'],
  abdominals: ['abs', 'core'],
  shoulder: ['delts', 'deltoid', 'shoulders'],
  shoulders: ['delts', 'deltoid', 'shoulder'],
  delts: ['deltoid', 'shoulder', 'shoulders'],
  deltoid: ['delts', 'shoulder', 'shoulders'],
  lat: ['lats', 'latissimus'],
  lats: ['lat', 'latissimus'],
  latissimus: ['lat', 'lats'],
  back: ['lats', 'lat'],
  trap: ['traps', 'trapezius'],
  traps: ['trap', 'trapezius'],
  trapezius: ['trap', 'traps'],
  chest: ['pectoral', 'pec', 'pecs'],
  pec: ['chest', 'pectoral', 'pecs'],
  pecs: ['chest', 'pectoral', 'pec'],
  arm: ['arms'],
  arms: ['arm'],
  curl: ['curls'],
  curls: ['curl'],
  press: ['pressing'],
  fly: ['flies', 'flyes'],
  flies: ['fly', 'flyes'],
  flyes: ['fly', 'flies'],
  raise: ['raises'],
  raises: ['raise'],
  pushdown: ['push-down'],
  pulldown: ['pull-down'],
  row: ['rows', 'rowing'],
  rows: ['row', 'rowing'],
  dumbbell: ['db'],
  barbell: ['bb'],
  extension: ['extensions'],
  extensions: ['extension'],
  crusher: ['crushers'],
  crushers: ['crusher'],
};

export function generateKeywords(name: string, muscles: string[]): string[] {
  const words = new Set<string>();

  // Add name words
  name
    .toLowerCase()
    .replace(/[(),']/g, '')
    .split(/[\s\-–]+/)
    .filter((w) => w.length > 1)
    .forEach((w) => {
      words.add(w);
      const syns = SYNONYMS[w];
      if (syns) syns.forEach((s) => words.add(s));
    });

  // Add full muscle names and their individual words
  muscles.forEach((m) => {
    words.add(m.toLowerCase());
    m.toLowerCase()
      .split(/[\s]+/)
      .filter((w) => w.length > 1)
      .forEach((w) => {
        words.add(w);
        const syns = SYNONYMS[w];
        if (syns) syns.forEach((s) => words.add(s));
      });
  });

  return [...words];
}

export function muscleToCategory(muscle: string): string {
  const m = muscle.toLowerCase();
  if (m.includes('lat') || m.includes('trap') || m.includes('teres') || m.includes('back') || m.includes('rhomboid')) return 'back';
  if (m.includes('chest') || m.includes('pec')) return 'chest';
  if (m.includes('delt')) return 'shoulders';
  if (m.includes('bicep') || m.includes('tricep') || m.includes('brachialis') || m.includes('head')) return 'arms';
  if (m.includes('abs') || m.includes('core') || m.includes('oblique')) return 'core';
  if (m.includes('quad') || m.includes('ham') || m.includes('glute') || m.includes('calf') || m.includes('leg')) return 'legs';
  if (m.includes('cardio')) return 'cardio';
  return 'other';
}

const FUSE_OPTIONS: IFuseOptions<Exercise> = {
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'keywords', weight: 0.35 },
    { name: 'muscles', weight: 0.25 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 1,
  findAllMatches: true,
};

export function useExerciseSearch(allExercises: Exercise[], query: string, debounceMs = 150): Exercise[] {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const fuse = useMemo(() => new Fuse(allExercises, FUSE_OPTIONS), [allExercises]);

  return useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return allExercises;

    // Expand query with synonyms for better matching
    const queryWords = q.toLowerCase().split(/\s+/);
    const expandedWords = new Set(queryWords);
    queryWords.forEach((w) => {
      const syns = SYNONYMS[w];
      if (syns) syns.forEach((s) => expandedWords.add(s));
    });
    const expandedQuery = [...expandedWords].join(' ');

    let results = fuse.search(expandedQuery);

    // If no results, try with a higher threshold (more fuzzy)
    if (results.length === 0) {
      const looseFuse = new Fuse(allExercises, { ...FUSE_OPTIONS, threshold: 0.6 });
      results = looseFuse.search(expandedQuery);
    }

    // Last resort: try each word individually
    if (results.length === 0) {
      const individualResults = new Map<string, FuseResult<Exercise>>();
      queryWords.forEach((word) => {
        fuse.search(word).forEach((r) => {
          if (!individualResults.has(r.item.id)) {
            individualResults.set(r.item.id, r);
          }
        });
      });
      results = [...individualResults.values()];
    }

    return results.length > 0 ? results.map((r) => r.item) : allExercises;
  }, [fuse, debouncedQuery, allExercises]);
}
