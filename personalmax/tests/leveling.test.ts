import { describe, expect, it } from "vitest";
import { levelFromXp, levelProgress, MAX_LEVEL, xpForLevel } from "@/lib/engine/leveling";

describe("xpForLevel", () => {
  it("matches the documented curve", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(282);
    expect(xpForLevel(5)).toBe(800);
    expect(xpForLevel(10)).toBe(2700);
  });

  it("is monotonically increasing", () => {
    for (let n = 1; n < 200; n++) {
      expect(xpForLevel(n + 1)).toBeGreaterThan(xpForLevel(n));
    }
  });
});

describe("levelFromXp", () => {
  it("handles boundaries exactly", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(281)).toBe(2);
    expect(levelFromXp(282)).toBe(3);
    expect(levelFromXp(800)).toBe(5);
    expect(levelFromXp(2700)).toBe(10);
  });

  it("is the exact inverse of xpForLevel at every threshold", () => {
    for (let n = 1; n <= 150; n++) {
      const threshold = xpForLevel(n);
      expect(levelFromXp(threshold)).toBe(n);
      if (threshold > 0) expect(levelFromXp(threshold - 1)).toBe(n - 1);
    }
  });

  it("never goes negative or past the cap", () => {
    expect(levelFromXp(-50)).toBe(1);
    expect(levelFromXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });
});

describe("levelProgress", () => {
  it("reports progress within the current level", () => {
    const p = levelProgress(150);
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(50);
    expect(p.forNext).toBe(182); // 282 - 100
  });
});
