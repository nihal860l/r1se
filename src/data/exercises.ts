import { Exercise } from '@/types/workout';
import { generateKeywords, muscleToCategory } from '@/lib/exerciseSearch';

const RAW_EXERCISES = `Wide grip lat pulldown – Lower Lats
Wide grip lat pulldown (single arm) – Lower Lats
Standard lat pulldown – Upper Lats
Standard lat pulldown (single arm) – Upper Lats
Mag grip lat pulldown – Lower Lats
Mag grip lat pulldown (single arm) – Lower Lats
Wide mag grip lat pulldown – Lower Lats
Wide mag grip lat pulldown (single arm) – Lower Lats
Close grip underhand lat pulldown – Upper Lats
Close grip underhand lat pulldown (single arm) – Upper Lats
Close mag grip lat pulldown – Lower Lats
Close mag grip lat pulldown (single arm) – Lower Lats
Close mag grip underhand lat pulldown – Upper Lats
Close mag grip underhand lat pulldown (single arm) – Upper Lats
Half kneeling single arm lat pulldown – Upper Lats
Single arm lat pulldown – Upper Lats
Machine lat pulldown – Upper Lats
Machine lat pulldown (single arm) – Upper Lats
Wide grip machine lat pulldown – Lower Lats
Wide grip machine lat pulldown (single arm) – Lower Lats
Teres Flap – Teres Major / Lower Lats
Teres Flap (single arm) – Teres Major / Lower Lats
Lat Flap – Lower Lats
Lat Flap (single arm) – Lower Lats
Chest-supported machine Kelsos shrugs – Mid Traps
Chest-supported machine Kelsos shrugs (single arm) – Mid Traps
Cable Kelsos shrugs – Mid Traps
Cable Kelsos shrugs (single arm) – Mid Traps
Dumbbell Kelsos shrugs – Mid Traps
Dumbbell Kelsos shrugs (single arm) – Mid Traps
Barbell Kelsos shrugs – Mid Traps
Wide grip reverse lat pulldown – Lower Traps
Wide grip reverse lat pulldown (single arm) – Lower Traps
Standard reverse lat pulldown – Lower Traps
Standard reverse lat pulldown (single arm) – Lower Traps
Mag grip reverse lat pulldown – Lower Traps
Mag grip reverse lat pulldown (single arm) – Lower Traps
Wide mag grip reverse lat pulldown – Lower Traps
Wide mag grip reverse lat pulldown (single arm) – Lower Traps
Close mag grip underhand reverse lat pulldown – Lower Traps
Close mag grip underhand reverse lat pulldown (single arm) – Lower Traps
Close mag grip reverse lat pulldown – Lower Traps
Close mag grip reverse lat pulldown (single arm) – Lower Traps
Half kneeling single arm reverse lat pulldown – Lower Traps
Single arm reverse lat pulldown – Lower Traps
Machine reverse lat pulldown – Lower Traps
Machine reverse lat pulldown (single arm) – Lower Traps
Wide grip machine reverse lat pulldown – Lower Traps
Wide grip machine reverse lat pulldown (single arm) – Lower Traps
Barbell shrugs – Upper Traps
Dumbbell shrugs – Upper Traps
Dumbbell shrugs (single arm) – Upper Traps
Smith machine shrugs – Upper Traps
Back extension (lower-back focused) – Lower Back
Back extension (lower-back focused, single side) – Lower Back
Unilateral back extension (lower-back focused) – Lower Back
Reverse hypers – Lower Back
Reverse hypers (single leg / unilateral) – Lower Back
Behind the back standing cable lateral raises – Side Delts
Behind the back standing cable lateral raises (single arm) – Side Delts
Standing cable lateral raises – Side Delts
Standing cable lateral raises (single arm) – Side Delts
Standing dumbbell lateral raises – Side Delts
Standing dumbbell lateral raises (single arm) – Side Delts
Seated dumbbell lateral raises – Side Delts
Seated dumbbell lateral raises (single arm) – Side Delts
Chest-supported Y raises – Side Delts
Chest-supported Y raises (single arm) – Side Delts
Abductor machine lateral raises – Side Delts
Abductor machine lateral raises (single arm) – Side Delts
Reverse peg deck – Rear Delts
Single arm reverse peg deck – Rear Delts
Dumbbell high elbow row – Rear Delts
Dumbbell high elbow row (single arm) – Rear Delts
Barbell high elbow row – Rear Delts
Chest-supported dumbbell high elbow row – Rear Delts
Chest-supported dumbbell high elbow row (single arm) – Rear Delts
Chest-supported barbell high elbow row – Rear Delts
Seated rear delt flies – Rear Delts
Seated rear delt flies (single arm) – Rear Delts
Bent over rear delt flies – Rear Delts
Bent over rear delt flies (single arm) – Rear Delts
Dumbbell seated shoulder press – Front Delts / Side Delts
Dumbbell seated shoulder press (single arm) – Front Delts / Side Delts
Front delt focused dumbbell seated shoulder press – Front Delts
Front delt focused dumbbell seated shoulder press (single arm) – Front Delts
Dumbbell standing shoulder press – Front Delts / Side Delts
Dumbbell standing shoulder press (single arm) – Front Delts / Side Delts
Front delt focused dumbbell standing shoulder press – Front Delts
Front delt focused dumbbell standing shoulder press (single arm) – Front Delts
Barbell seated shoulder press – Front Delts / Side Delts
Front delt focused barbell seated shoulder press – Front Delts
Barbell standing shoulder press – Front Delts / Side Delts
Front delt focused barbell standing shoulder press – Front Delts
Smith machine seated shoulder press – Front Delts / Side Delts
Front delt focused Smith machine seated shoulder press – Front Delts
Smith machine standing shoulder press – Front Delts / Side Delts
Front delt focused Smith machine standing shoulder press – Front Delts
Machine shoulder press – Front Delts / Side Delts
Machine shoulder press (single arm) – Front Delts / Side Delts
Front delt focused machine shoulder press – Front Delts
Front delt focused machine shoulder press (single arm) – Front Delts
Cable crunches – Upper abs
Machine crunches – Upper abs
Lying crunches – Upper abs
Decline bench crunches – Upper abs
Incline leg raises – Lower abs
Hanging leg raises – Lower abs
Lying leg raises – Lower abs
Captain's chair leg raises – Lower abs
Incline barbell bench press – Lower Chest
Incline dumbbell bench press – Lower Chest
Incline barbell guillotine press – Lower Chest
Incline dumbbell guillotine press – Lower Chest
Incline dumbbell hex press – Upper Chest / Triceps Lateral Head
Incline close-grip barbell bench press – Upper Chest / Triceps Lateral Head
Incline wide-grip barbell bench press – Lower Chest
Smith incline press – Lower Chest
Smith incline guillotine press – Lower Chest
Smith incline close-grip press – Upper Chest / Triceps Lateral Head
Smith incline wide-grip press – Lower Chest
Lying machine chest press – Lower Chest
Wide-grip lying machine chest press – Lower Chest
Close-grip lying machine chest press – Upper Chest / Triceps Lateral Head
Seated machine chest press – Lower Chest
Wide-grip seated machine chest press – Lower Chest
Close-grip seated machine chest press – Upper Chest / Triceps Lateral Head
Flat barbell bench press – Lower Chest
Flat dumbbell bench press – Lower Chest
Flat barbell guillotine press – Lower Chest
Flat dumbbell guillotine press – Lower Chest
Flat dumbbell hex press – Upper Chest / Triceps Lateral Head
Flat close-grip barbell bench press – Upper Chest / Triceps Lateral Head
Flat wide-grip barbell bench press – Lower Chest
Smith flat press – Lower Chest
Smith flat guillotine press – Lower Chest
Smith flat close-grip press – Upper Chest / Triceps Lateral Head
Smith flat wide-grip press – Lower Chest
Seated machine chest flies – Lower Chest
Deck-to-deck line machine chest flies – Lower Chest
Flat dumbbell chest flies – Lower Chest
Incline dumbbell chest flies – Lower Chest
Cable chest flies – Lower Chest
Low-to-high cable chest flies – Upper Chest
High-to-low cable chest flies – Lower Chest
Standard push-ups – Lower Chest
Close-grip standard push-ups – Upper Chest / Triceps Lateral Head
Wide-grip standard push-ups – Lower Chest
Reverse-grip standard push-ups – Upper Chest / Triceps Lateral Head
Incline push-ups – Lower Chest
Close-grip incline push-ups – Upper Chest / Triceps Lateral Head
Wide-grip incline push-ups – Lower Chest
Reverse-grip incline push-ups – Upper Chest / Triceps Lateral Head
Decline push-ups – Lower Chest
Close-grip decline push-ups – Upper Chest / Triceps Lateral Head
Wide-grip decline push-ups – Lower Chest
Reverse-grip decline push-ups – Upper Chest / Triceps Lateral Head
Standard clap push-ups – Lower Chest
Incline clap push-ups – Lower Chest
Decline clap push-ups – Lower Chest
Negative standard push-ups – Lower Chest
Negative close-grip standard push-ups – Upper Chest / Triceps Lateral Head
Negative wide-grip standard push-ups – Lower Chest
Negative reverse-grip standard push-ups – Upper Chest / Triceps Lateral Head
Negative incline push-ups – Lower Chest
Negative close-grip incline push-ups – Upper Chest / Triceps Lateral Head
Negative wide-grip incline push-ups – Lower Chest
Negative reverse-grip incline push-ups – Upper Chest / Triceps Lateral Head
Negative decline push-ups – Lower Chest
Negative close-grip decline push-ups – Upper Chest / Triceps Lateral Head
Negative wide-grip decline push-ups – Lower Chest
Negative reverse-grip decline push-ups – Upper Chest / Triceps Lateral Head
Negative standard clap push-ups – Lower Chest
Negative incline clap push-ups – Lower Chest
Negative decline clap push-ups – Lower Chest
Chest dip – Lower Chest
Kelso dip – Pectoralis Minor
Cable Bayesian curls – Long head emphasis
Cable Bayesian curls (single arm) – Long head emphasis
Super cable Bayesian curls – Long head emphasis
Super cable Bayesian curls (single arm) – Long head emphasis
Single arm Bayesian curls – Long head emphasis
Single arm super cable Bayesian curls – Long head emphasis
Lying bicep curls – Long head emphasis
Lying bicep curls (single arm) – Long head emphasis
Machine preacher curls – Short head emphasis
Machine preacher curls (single arm) – Short head emphasis
Single arm machine preacher curls – Short head emphasis
Dumbbell preacher curls – Short head emphasis
Dumbbell preacher curls (single arm) – Short head emphasis
Single arm dumbbell preacher curls – Short head emphasis
Barbell preacher curls – Short head emphasis
Concentration curls – Short head emphasis
Concentration curls (single arm) – Short head emphasis
Standing barbell bicep curls – Biceps
Standing dumbbell bicep curls – Biceps
Standing dumbbell bicep curls (single arm) – Biceps
Seated dumbbell bicep curls – Biceps
Seated dumbbell bicep curls (single arm) – Biceps
Seated dumbbell hammer curls – Biceps
Seated dumbbell hammer curls (single arm) – Biceps
Standing dumbbell hammer curls – Biceps
Standing dumbbell hammer curls (single arm) – Biceps
Cable curls – Biceps
Cable curls (single arm) – Biceps
Machine bicep curls – Biceps
Machine bicep curls (single arm) – Biceps
Single arm machine bicep curls – Biceps
EZ bar curls – Biceps
Chin ups – Biceps
Seated dumbbell reverse curls – Brachialis emphasis
Seated dumbbell reverse curls (single arm) – Brachialis emphasis
Standing dumbbell reverse curls – Brachialis emphasis
Standing dumbbell reverse curls (single arm) – Brachialis emphasis
Barbell reverse curls – Brachialis emphasis
EZ bar reverse curls – Brachialis emphasis
Dumbbell JM press – Triceps Lateral Head / Medial Head
Dumbbell JM press (single arm) – Triceps Lateral Head / Medial Head
Barbell JM press – Triceps Lateral Head / Medial Head
Smith machine JM press – Triceps Lateral Head / Medial Head
Diamond push-ups – Triceps Lateral Head / Medial Head
Incline diamond push-ups – Triceps Lateral Head / Medial Head
Decline diamond push-ups – Triceps Lateral Head / Medial Head
Dumbbell skull crushers – Triceps Long Head / Medial Head
Dumbbell skull crushers (single arm) – Triceps Long Head / Medial Head
Barbell skull crushers – Triceps Long Head / Medial Head
Smith machine skull crushers – Triceps Long Head / Medial Head
Cable triceps overhead extension – Triceps Long Head / Medial Head
Cable triceps overhead extension (single arm) – Triceps Long Head / Medial Head
Dumbbell triceps overhead extension – Triceps Long Head / Medial Head
Dumbbell triceps overhead extension (single arm) – Triceps Long Head / Medial Head
Barbell triceps overhead extension – Triceps Long Head / Medial Head
Smith machine triceps overhead extension – Triceps Long Head / Medial Head
Cable triceps pushdown – Triceps Long Head / Medial Head
Cable triceps pushdown (single arm) – Triceps Long Head / Medial Head
Cable carter extension – Triceps Long Head / Medial Head
Cable carter extension (single arm) – Triceps Long Head / Medial Head
Cable rope pushdown – Triceps Long Head / Medial Head
Cable rope pushdown (single arm) – Triceps Long Head / Medial Head
Rope carter extension – Triceps Long Head / Medial Head
Rope carter extension (single arm) – Triceps Long Head / Medial Head`;

function parseExercise(raw: string, index: number): Exercise {
  const dashIndex = raw.lastIndexOf('–');
  if (dashIndex === -1) {
    return {
      id: `default-${index + 1}`,
      name: raw.trim(),
      muscles: ['Other'],
      keywords: generateKeywords(raw.trim(), ['Other']),
      isDefault: true,
      category: 'other',
      muscleGroup: 'Other',
      description: raw.trim(),
    };
  }

  const name = raw.substring(0, dashIndex).trim();
  const musclePart = raw.substring(dashIndex + 1).trim();
  const muscles = musclePart.split('/').map((s) => s.trim()).filter(Boolean);
  const category = muscleToCategory(muscles[0] || '');

  return {
    id: `default-${index + 1}`,
    name,
    muscles,
    keywords: generateKeywords(name, muscles),
    isDefault: true,
    category,
    muscleGroup: muscles[0] || 'Other',
    description: name,
  };
}

export const exercises: Exercise[] = RAW_EXERCISES.split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line, i) => parseExercise(line, i));

export const categoryLabels: Record<string, string> = {
  back: 'Back',
  chest: 'Chest',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
  other: 'Other',
};

export const allMuscleGroups: string[] = [
  ...new Set(exercises.flatMap((e) => e.muscles)),
].sort();
