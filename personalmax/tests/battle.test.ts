import { describe, expect, it } from "vitest";
import {
  battlePower,
  type Combatant,
  resolveBattle,
  ROLL_MAX,
  ROLL_MIN,
} from "@/lib/engine/battle";

const combatant = (userId: string, overrides: Partial<Combatant> = {}): Combatant => ({
  userId,
  level: 10,
  strength: 20,
  endurance: 20,
  discipline: 20,
  vitality: 20,
  ...overrides,
});

describe("battlePower", () => {
  it("weights stats 35/25/20/20 and scales 2% per level", () => {
    // equal stats of 20 -> weighted sum 20; level 10 -> x1.2 -> 24
    expect(battlePower(combatant("a"))).toBeCloseTo(24, 10);
  });

  it("higher level wins on equal stats and equal rolls", () => {
    const low = combatant("low", { level: 1 });
    const high = combatant("high", { level: 50 });
    expect(battlePower(high)).toBeGreaterThan(battlePower(low));
  });
});

describe("resolveBattle", () => {
  it("is deterministic given rolls", () => {
    const a = combatant("a", { strength: 50 });
    const b = combatant("b");
    const out = resolveBattle(a, b, 1.0, 1.0);
    expect(out.winnerId).toBe("a");
    expect(out.challengerScore).toBeGreaterThan(out.opponentScore);
  });

  it("ties go to the defender (opponent)", () => {
    const a = combatant("a");
    const b = combatant("b");
    const out = resolveBattle(a, b, 1.0, 1.0);
    expect(out.challengerScore).toBe(out.opponentScore);
    expect(out.winnerId).toBe("b");
  });

  it("the bounded roll can flip an outcome only within ~15%", () => {
    const a = combatant("a");
    const strongerB = combatant("b", { strength: 24 }); // ~5% stronger
    // Best roll for a, worst for b: a can steal the win.
    expect(resolveBattle(a, strongerB, ROLL_MAX, ROLL_MIN).winnerId).toBe("a");

    const muchStrongerB = combatant("b", {
      strength: 99,
      endurance: 99,
      discipline: 99,
      vitality: 99,
      level: 50,
    });
    // No roll in range lets a beat a vastly stronger opponent.
    expect(resolveBattle(a, muchStrongerB, ROLL_MAX, ROLL_MIN).winnerId).toBe("b");
  });

  it("scores are rounded to 2 decimals like the SQL", () => {
    const out = resolveBattle(combatant("a"), combatant("b"), 1.013, 0.987);
    expect(out.challengerScore).toBe(Math.round(24 * 1.013 * 100) / 100);
    expect(out.opponentScore).toBe(Math.round(24 * 0.987 * 100) / 100);
  });
});
