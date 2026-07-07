// Leveling curve. TypeScript mirror of the authoritative SQL functions
// xp_for_level / level_from_xp (supabase/migrations). See docs/FORMULAS.md.

export const MAX_LEVEL = 500;

/** Cumulative XP required to reach level n: floor(100 * (n-1)^1.5). */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.floor(100 * Math.pow(n - 1, 1.5));
}

/** Highest level whose XP requirement is <= xp. */
export function levelFromXp(xp: number): number {
  const safe = Math.max(0, xp);
  let level = Math.max(1, Math.floor(Math.pow(safe / 100, 2 / 3)) + 1);
  while (xpForLevel(level + 1) <= safe) level += 1;
  while (level > 1 && xpForLevel(level) > safe) level -= 1;
  return Math.min(level, MAX_LEVEL);
}

/** Progress within the current level, for XP bars. */
export function levelProgress(xp: number): {
  level: number;
  intoLevel: number;
  forNext: number;
} {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  return {
    level,
    intoLevel: xp - floor,
    forNext: Math.max(1, ceiling - floor),
  };
}
