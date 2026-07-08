import { describe, expect, it } from "vitest";
import {
  generateWorkoutPlan,
  type PlanExperience,
  type PlanGoal,
  type PlanSplit,
} from "@/lib/engine/workout-plan";

const GOALS: PlanGoal[] = ["strength", "hypertrophy", "endurance", "general"];
const EXPERIENCES: PlanExperience[] = ["beginner", "intermediate", "advanced"];
const SPLITS: PlanSplit[] = ["full_body", "upper_lower", "push_pull_legs", "bro_split"];

describe("generateWorkoutPlan", () => {
  it("is deterministic: identical inputs produce identical plans", () => {
    const input = {
      goal: "hypertrophy",
      experience: "intermediate",
      daysPerWeek: 4,
      splitType: "upper_lower",
    } as const;
    expect(generateWorkoutPlan(input)).toEqual(generateWorkoutPlan(input));
  });

  it("produces a valid plan for every combination of inputs", () => {
    for (const goal of GOALS)
      for (const experience of EXPERIENCES)
        for (const splitType of SPLITS)
          for (let daysPerWeek = 1; daysPerWeek <= 7; daysPerWeek++) {
            const plan = generateWorkoutPlan({ goal, experience, daysPerWeek, splitType });
            expect(plan.days).toHaveLength(daysPerWeek);
            for (const day of plan.days) {
              expect(day.exercises.length).toBeGreaterThanOrEqual(4);
              expect(day.exercises.length).toBeLessThanOrEqual(6);
              // no duplicate exercise within a day
              const names = day.exercises.map((e) => e.name);
              expect(new Set(names).size).toBe(names.length);
              for (const ex of day.exercises) {
                expect(ex.sets).toBeGreaterThanOrEqual(3);
                expect(ex.sets).toBeLessThanOrEqual(5);
                expect(ex.restSeconds).toBeGreaterThanOrEqual(45);
                expect(ex.restSeconds).toBeLessThanOrEqual(180);
              }
            }
          }
  });

  it("respects the chosen split's day cycle", () => {
    const ppl = generateWorkoutPlan({
      goal: "general",
      experience: "beginner",
      daysPerWeek: 6,
      splitType: "push_pull_legs",
    });
    expect(ppl.days.map((d) => d.focus)).toEqual([
      "Push",
      "Pull",
      "Legs",
      "Push",
      "Pull",
      "Legs",
    ]);

    const bro = generateWorkoutPlan({
      goal: "general",
      experience: "beginner",
      daysPerWeek: 5,
      splitType: "bro_split",
    });
    expect(bro.days.map((d) => d.focus)).toEqual([
      "Chest",
      "Back",
      "Legs",
      "Shoulders",
      "Arms",
    ]);
  });

  it("varies repeated focus days within the week", () => {
    const plan = generateWorkoutPlan({
      goal: "general",
      experience: "beginner",
      daysPerWeek: 3,
      splitType: "full_body",
    });
    const [a, b] = [plan.days[0], plan.days[1]];
    expect(a.exercises.map((e) => e.name)).not.toEqual(b.exercises.map((e) => e.name));
  });

  it("scales exercise count with experience", () => {
    const count = (experience: PlanExperience) =>
      generateWorkoutPlan({
        goal: "strength",
        experience,
        daysPerWeek: 3,
        splitType: "full_body",
      }).days[0].exercises.length;
    expect(count("beginner")).toBe(4);
    expect(count("intermediate")).toBe(5);
    expect(count("advanced")).toBe(6);
  });

  it("applies the goal's rep scheme (main lifts vs accessories)", () => {
    const plan = generateWorkoutPlan({
      goal: "strength",
      experience: "beginner",
      daysPerWeek: 2,
      splitType: "upper_lower",
    });
    const day = plan.days[0];
    expect(day.exercises[0]).toMatchObject({ sets: 5, reps: "5", restSeconds: 180 });
    expect(day.exercises[2]).toMatchObject({ sets: 3, reps: "6-8", restSeconds: 120 });
  });

  it("rejects invalid daysPerWeek", () => {
    expect(() =>
      generateWorkoutPlan({
        goal: "general",
        experience: "beginner",
        daysPerWeek: 0,
        splitType: "full_body",
      }),
    ).toThrow();
    expect(() =>
      generateWorkoutPlan({
        goal: "general",
        experience: "beginner",
        daysPerWeek: 8,
        splitType: "full_body",
      }),
    ).toThrow();
  });
});
