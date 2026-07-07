import { describe, expect, it } from "vitest";
import { KINGDOM_TIERS, nextTier, tierForLevel } from "@/lib/engine/kingdom";

describe("kingdom tiers", () => {
  it("has 8 strictly ascending tiers starting at level 1", () => {
    expect(KINGDOM_TIERS).toHaveLength(8);
    expect(KINGDOM_TIERS[0].minLevel).toBe(1);
    for (let i = 1; i < KINGDOM_TIERS.length; i++) {
      expect(KINGDOM_TIERS[i].minLevel).toBeGreaterThan(KINGDOM_TIERS[i - 1].minLevel);
      expect(KINGDOM_TIERS[i].tier).toBe(KINGDOM_TIERS[i - 1].tier + 1);
    }
  });

  it("resolves the right tier at boundaries", () => {
    expect(tierForLevel(1).title).toBe("Campsite");
    expect(tierForLevel(4).title).toBe("Campsite");
    expect(tierForLevel(5).title).toBe("Hamlet");
    expect(tierForLevel(74).title).toBe("Kingdom");
    expect(tierForLevel(75).title).toBe("Empire");
    expect(tierForLevel(500).title).toBe("Empire");
  });

  it("nextTier points at the following unlock and null at the top", () => {
    expect(nextTier(1)?.title).toBe("Hamlet");
    expect(nextTier(74)?.title).toBe("Empire");
    expect(nextTier(75)).toBeNull();
  });
});
