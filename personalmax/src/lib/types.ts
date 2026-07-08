// Minimal row types for the tables/RPCs the app reads.

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
}

export interface CharacterRow {
  user_id: string;
  name: string;
  level: number;
  xp: number;
  strength: number;
  endurance: number;
  discipline: number;
  vitality: number;
  battles_won: number;
  battles_fought: number;
  updated_at: string;
}

export interface WorkoutSetRow {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  duration_seconds: number | null;
}

export interface WorkoutExerciseRow {
  id: string;
  session_id: string;
  name: string;
  position: number;
  notes: string;
  workout_sets: WorkoutSetRow[];
}

export interface WorkoutSessionRow {
  id: string;
  title: string;
  notes: string;
  performed_at: string;
  duration_minutes: number | null;
  created_at: string;
  workout_exercises: WorkoutExerciseRow[];
}

export interface WorkoutPlanRow {
  id: string;
  goal: string;
  experience: string;
  days_per_week: number;
  split_type: string;
  plan: import("@/lib/engine/workout-plan").WorkoutPlan;
  created_at: string;
}

export interface NutritionTargetRow {
  id: string;
  bodyweight_kg: number;
  height_cm: number;
  age: number | null;
  sex: string | null;
  goal: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface MealRow {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  eaten_on: string;
  created_at: string;
}

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
}

export interface BattleRow {
  id: string;
  challenger_id: string;
  opponent_id: string;
  winner_id: string;
  challenger_score: number;
  opponent_score: number;
  challenger_roll: number;
  opponent_roll: number;
  xp_awarded: number;
  created_at: string;
}

export interface AwardRow {
  key: string;
  name: string;
  description: string;
  xp_bonus: number;
  icon: string;
  sort: number;
}

export interface UserAwardRow {
  award_key: string;
  unlocked_at: string;
}

export interface KingdomTierRow {
  tier: number;
  min_level: number;
  title: string;
  description: string;
  accent: string;
}
