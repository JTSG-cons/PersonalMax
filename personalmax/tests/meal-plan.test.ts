import { describe, expect, it } from "vitest";
import {
  ACTIVITY_MULTIPLIER,
  bmr,
  computeNutritionTarget,
  GOAL_CALORIE_FACTOR,
  MAX_CALORIES,
  MIN_CALORIES,
  SEX_CONSTANT,
} from "@/lib/engine/meal-plan";

describe("bmr (Mifflin-St Jeor)", () => {
  it("computes the textbook formula for each sex constant", () => {
    // 80kg, 180cm, 30y male: 800 + 1125 - 150 + 5 = 1780
    expect(bmr({ bodyweightKg: 80, heightCm: 180, age: 30, sex: "male", goal: "maintain" })).toBe(1780);
    // female constant: -161 -> 1614
    expect(bmr({ bodyweightKg: 80, heightCm: 180, age: 30, sex: "female", goal: "maintain" })).toBe(1614);
  });

  it("uses the neutral average constant when sex is omitted or null", () => {
    const skipped = bmr({ bodyweightKg: 80, heightCm: 180, age: 30, goal: "maintain" });
    const explicit = bmr({ bodyweightKg: 80, heightCm: 180, age: 30, sex: null, goal: "maintain" });
    expect(skipped).toBe(explicit);
    expect(skipped).toBe(1780 - 5 + SEX_CONSTANT.average); // midpoint of the two constants
  });

  it("defaults age to 30 when omitted", () => {
    expect(bmr({ bodyweightKg: 80, heightCm: 180, goal: "maintain" })).toBe(
      bmr({ bodyweightKg: 80, heightCm: 180, age: 30, goal: "maintain" }),
    );
  });
});

describe("computeNutritionTarget", () => {
  const base = { bodyweightKg: 80, heightCm: 180, age: 30, sex: "male" } as const;

  it("is deterministic", () => {
    const a = computeNutritionTarget({ ...base, goal: "cut" });
    const b = computeNutritionTarget({ ...base, goal: "cut" });
    expect(a).toEqual(b);
  });

  it("applies goal factors to maintenance calories", () => {
    const maintenance = 1780 * ACTIVITY_MULTIPLIER; // 2670
    expect(computeNutritionTarget({ ...base, goal: "maintain" }).calories).toBe(
      Math.round(maintenance),
    );
    expect(computeNutritionTarget({ ...base, goal: "cut" }).calories).toBe(
      Math.round(maintenance * GOAL_CALORIE_FACTOR.cut),
    );
    expect(computeNutritionTarget({ ...base, goal: "bulk" }).calories).toBe(
      Math.round(maintenance * GOAL_CALORIE_FACTOR.bulk),
    );
  });

  it("cut > protein per kg than maintain; macros cover the calorie budget", () => {
    const cut = computeNutritionTarget({ ...base, goal: "cut" });
    const maintain = computeNutritionTarget({ ...base, goal: "maintain" });
    expect(cut.proteinG).toBeGreaterThan(maintain.proteinG);

    for (const target of [cut, maintain]) {
      const macroCalories = target.proteinG * 4 + target.carbsG * 4 + target.fatG * 9;
      // rounding tolerance: within 2% of the calorie target
      expect(Math.abs(macroCalories - target.calories)).toBeLessThanOrEqual(
        target.calories * 0.02,
      );
    }
  });

  it("clamps calories to the safe floor and ceiling", () => {
    const tiny = computeNutritionTarget({
      bodyweightKg: 35,
      heightCm: 140,
      age: 100,
      sex: "female",
      goal: "cut",
    });
    expect(tiny.calories).toBeGreaterThanOrEqual(MIN_CALORIES);

    const huge = computeNutritionTarget({
      bodyweightKg: 400,
      heightCm: 250,
      age: 13,
      sex: "male",
      goal: "bulk",
    });
    expect(huge.calories).toBeLessThanOrEqual(MAX_CALORIES);
  });

  it("sex changes ONLY the calorie math, never other outputs' structure", () => {
    const male = computeNutritionTarget({ ...base, sex: "male", goal: "maintain" });
    const none = computeNutritionTarget({ ...base, sex: null, goal: "maintain" });
    // protein is bodyweight-based, identical regardless of sex
    expect(male.proteinG).toBe(none.proteinG);
    // calorie difference is bounded by the constant spread * activity factor
    expect(Math.abs(male.calories - none.calories)).toBeLessThanOrEqual(
      Math.ceil((SEX_CONSTANT.male - SEX_CONSTANT.average) * ACTIVITY_MULTIPLIER) + 1,
    );
  });

  it("rejects out-of-range inputs", () => {
    expect(() =>
      computeNutritionTarget({ bodyweightKg: 20, heightCm: 180, goal: "cut" }),
    ).toThrow();
    expect(() =>
      computeNutritionTarget({ bodyweightKg: 80, heightCm: 90, goal: "cut" }),
    ).toThrow();
  });
});
