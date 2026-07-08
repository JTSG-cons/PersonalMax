import { describe, expect, it } from "vitest";
import { AWARDS, type AwardCounters, metAwardKeys } from "@/lib/engine/awards";

const zero: AwardCounters = {
  sessionCount: 0,
  longestStreak: 0,
  mealCount: 0,
  battlesWon: 0,
  friendCount: 0,
};

describe("award catalog", () => {
  it("ships exactly the five seed awards", () => {
    expect(AWARDS.map((a) => a.key).sort()).toEqual([
      "first_battle_win",
      "first_meal",
      "first_workout",
      "squad_five",
      "week_streak",
    ]);
  });

  it("every award grants a positive XP bonus", () => {
    for (const award of AWARDS) expect(award.xpBonus).toBeGreaterThan(0);
  });
});

describe("metAwardKeys", () => {
  it("unlocks nothing for a new user", () => {
    expect(metAwardKeys(zero)).toEqual([]);
  });

  it("evaluates each condition at its exact threshold", () => {
    expect(metAwardKeys({ ...zero, sessionCount: 1 })).toEqual(["first_workout"]);
    expect(metAwardKeys({ ...zero, longestStreak: 7 })).toEqual(["week_streak"]);
    expect(metAwardKeys({ ...zero, longestStreak: 6 })).toEqual([]);
    expect(metAwardKeys({ ...zero, mealCount: 1 })).toEqual(["first_meal"]);
    expect(metAwardKeys({ ...zero, battlesWon: 1 })).toEqual(["first_battle_win"]);
    expect(metAwardKeys({ ...zero, friendCount: 5 })).toEqual(["squad_five"]);
    expect(metAwardKeys({ ...zero, friendCount: 4 })).toEqual([]);
  });

  it("can unlock everything at once", () => {
    const all = metAwardKeys({
      sessionCount: 10,
      longestStreak: 10,
      mealCount: 10,
      battlesWon: 3,
      friendCount: 8,
    });
    expect(all.sort()).toEqual(AWARDS.map((a) => a.key).sort());
  });
});
