// Deterministic calorie/macro target generator.
//
// A rules table, not a black box: BMR via Mifflin-St Jeor, a fixed activity
// multiplier, a goal adjustment, and macro splits by g/kg and % of calories.
// Fully unit-tested (tests/meal-plan.test.ts). See docs/FORMULAS.md.
//
// Biological sex is OPTIONAL and used only for the BMR constant below —
// nothing else in the app reads it. Skipping it uses the neutral average.

export type NutritionGoal = "cut" | "maintain" | "bulk";
export type BiologicalSex = "male" | "female";

export interface NutritionInput {
  bodyweightKg: number;
  heightCm: number;
  /** Optional; DEFAULT_AGE is used when omitted. */
  age?: number | null;
  /** Optional; the neutral average constant is used when omitted. */
  sex?: BiologicalSex | null;
  goal: NutritionGoal;
}

export interface NutritionTarget {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const DEFAULT_AGE = 30;

/** Mifflin-St Jeor sex constant; "average" is the midpoint of +5 and -161. */
export const SEX_CONSTANT: Record<BiologicalSex | "average", number> = {
  male: 5,
  female: -161,
  average: -78,
};

/** Fixed moderate-activity multiplier (gym-goer baseline). */
export const ACTIVITY_MULTIPLIER = 1.5;

export const GOAL_CALORIE_FACTOR: Record<NutritionGoal, number> = {
  cut: 0.8,
  maintain: 1.0,
  bulk: 1.1,
};

/** Protein grams per kg bodyweight, by goal. */
export const PROTEIN_G_PER_KG: Record<NutritionGoal, number> = {
  cut: 2.2,
  maintain: 1.8,
  bulk: 2.0,
};

/** Fraction of calories allocated to fat. */
export const FAT_CALORIE_FRACTION = 0.25;

export const MIN_CALORIES = 1200;
export const MAX_CALORIES = 6000;

export function bmr(input: NutritionInput): number {
  const age = input.age ?? DEFAULT_AGE;
  const sexConstant = SEX_CONSTANT[input.sex ?? "average"];
  return 10 * input.bodyweightKg + 6.25 * input.heightCm - 5 * age + sexConstant;
}

export function computeNutritionTarget(input: NutritionInput): NutritionTarget {
  if (input.bodyweightKg < 30 || input.bodyweightKg > 400) {
    throw new Error("bodyweightKg out of range (30-400)");
  }
  if (input.heightCm < 100 || input.heightCm > 250) {
    throw new Error("heightCm out of range (100-250)");
  }

  const maintenance = bmr(input) * ACTIVITY_MULTIPLIER;
  const raw = maintenance * GOAL_CALORIE_FACTOR[input.goal];
  const calories = Math.round(Math.min(MAX_CALORIES, Math.max(MIN_CALORIES, raw)));

  const proteinG = Math.round(input.bodyweightKg * PROTEIN_G_PER_KG[input.goal]);
  const fatG = Math.round((calories * FAT_CALORIE_FRACTION) / 9);
  const remaining = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remaining / 4));

  return { calories, proteinG, carbsG, fatG };
}
