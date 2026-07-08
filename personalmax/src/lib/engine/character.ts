// Character stat engine. TypeScript mirror of the authoritative SQL in
// compute_progress (supabase/migrations). See docs/FORMULAS.md for the spec.
//
// Stats are derived ONLY from real logged history; nothing here is ever
// trusted from a client. The app uses this mirror for display math and unit
// tests; the database recomputes the same numbers server-side.

export interface ProgressAggregates {
  /** Sum of reps * weightKg over all logged sets. */
  totalVolumeKg: number;
  /** Sum of session duration minutes. */
  totalDurationMin: number;
  /** Sum of reps over all logged sets. */
  totalReps: number;
  /** Number of workout sessions. */
  sessionCount: number;
  /** Distinct days with at least one workout. */
  activeDays: number;
  /** Distinct days with at least one meal logged. */
  mealDays: number;
  /** Total meals logged. */
  mealCount: number;
  /** Longest consecutive-day streak of logging (workout or meal). */
  longestStreak: number;
  /** Days whose calorie total was within ±10% of the latest target. */
  adherentDays: number;
  /** Battles won. */
  battlesWon: number;
}

export interface CharacterStats {
  strength: number;
  endurance: number;
  discipline: number;
  vitality: number;
}

const clampStat = (n: number) => Math.min(99, Math.max(1, n));

export function computeStats(a: ProgressAggregates): CharacterStats {
  const strength = clampStat(
    1 + Math.floor(20 * Math.log10(1 + a.totalVolumeKg / 1000)),
  );
  const endurance = clampStat(
    1 +
      Math.floor(15 * Math.log10(1 + a.totalDurationMin / 60)) +
      Math.floor(10 * Math.log10(1 + a.totalReps / 500)),
  );
  const discipline = clampStat(
    1 +
      Math.floor(2 * Math.sqrt(a.activeDays + a.mealDays)) +
      Math.min(a.longestStreak, 30),
  );
  const vitality = clampStat(
    1 +
      Math.floor(3 * Math.sqrt(a.mealDays)) +
      Math.floor(4 * Math.sqrt(a.adherentDays)),
  );
  return { strength, endurance, discipline, vitality };
}

/** XP for one workout session: 50 base + volume bonus, capped at 100 total. */
export function sessionXp(sessionVolumeKg: number): number {
  return 50 + Math.min(Math.floor(sessionVolumeKg / 100), 50);
}

/** XP for one day of meals: 10 per meal, at most 3 meals count. */
export function mealDayXp(mealsThatDay: number): number {
  return Math.min(mealsThatDay, 3) * 10;
}

export const BATTLE_WIN_XP = 25;

export function totalXp(parts: {
  workoutXp: number;
  mealXp: number;
  battlesWon: number;
  awardXp: number;
}): number {
  return (
    parts.workoutXp + parts.mealXp + parts.battlesWon * BATTLE_WIN_XP + parts.awardXp
  );
}
