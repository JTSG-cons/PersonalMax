import { describe, expect, it } from "vitest";
import {
  computeStats,
  mealDayXp,
  type ProgressAggregates,
  sessionXp,
  totalXp,
} from "@/lib/engine/character";

const zero: ProgressAggregates = {
  totalVolumeKg: 0,
  totalDurationMin: 0,
  totalReps: 0,
  sessionCount: 0,
  activeDays: 0,
  mealDays: 0,
  mealCount: 0,
  longestStreak: 0,
  adherentDays: 0,
  battlesWon: 0,
};

describe("computeStats", () => {
  it("returns all 1s for a brand-new user", () => {
    expect(computeStats(zero)).toEqual({
      strength: 1,
      endurance: 1,
      discipline: 1,
      vitality: 1,
    });
  });

  it("computes documented example values", () => {
    // 10,000 kg lifetime volume -> 1 + floor(20*log10(11)) = 21
    expect(computeStats({ ...zero, totalVolumeKg: 10_000 }).strength).toBe(21);
    // 60 min + 500 reps -> 1 + floor(15*log10(2)) + floor(10*log10(2)) = 1+4+3 = 8
    expect(
      computeStats({ ...zero, totalDurationMin: 60, totalReps: 500 }).endurance,
    ).toBe(8);
    // 9 active days + 0 meal days, streak 5 -> 1 + floor(2*3) + 5 = 12
    expect(
      computeStats({ ...zero, activeDays: 9, longestStreak: 5 }).discipline,
    ).toBe(12);
    // 16 meal days, 4 adherent -> 1 + floor(3*4) + floor(4*2) = 21
    expect(
      computeStats({ ...zero, mealDays: 16, adherentDays: 4 }).vitality,
    ).toBe(21);
  });

  it("clamps every stat to 1..99", () => {
    const maxed = computeStats({
      ...zero,
      totalVolumeKg: 1e12,
      totalDurationMin: 1e9,
      totalReps: 1e9,
      activeDays: 100_000,
      mealDays: 100_000,
      longestStreak: 100_000,
      adherentDays: 100_000,
    });
    expect(maxed).toEqual({ strength: 99, endurance: 99, discipline: 99, vitality: 99 });
  });

  it("streak contribution to discipline caps at 30", () => {
    const a = computeStats({ ...zero, longestStreak: 30 }).discipline;
    const b = computeStats({ ...zero, longestStreak: 300 }).discipline;
    expect(a).toBe(b);
  });
});

describe("XP pieces", () => {
  it("sessionXp: 50 base, +1 per 100kg volume, capped at 100", () => {
    expect(sessionXp(0)).toBe(50);
    expect(sessionXp(99)).toBe(50);
    expect(sessionXp(100)).toBe(51);
    expect(sessionXp(2500)).toBe(75);
    expect(sessionXp(1_000_000)).toBe(100);
  });

  it("mealDayXp: 10 per meal, max 3 count", () => {
    expect(mealDayXp(0)).toBe(0);
    expect(mealDayXp(1)).toBe(10);
    expect(mealDayXp(3)).toBe(30);
    expect(mealDayXp(12)).toBe(30);
  });

  it("totalXp sums all sources with 25 XP per battle win", () => {
    expect(totalXp({ workoutXp: 100, mealXp: 30, battlesWon: 2, awardXp: 75 })).toBe(255);
  });
});
