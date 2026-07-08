// Kingdom tier catalog. TypeScript mirror of the seeded kingdom_tiers table.
// This is a level-gated cosmetic progression (tier unlocks), not a simulation.

export interface KingdomTier {
  tier: number;
  minLevel: number;
  title: string;
  description: string;
  accent: string;
}

export const KINGDOM_TIERS: KingdomTier[] = [
  { tier: 1, minLevel: 1,  title: "Campsite",   description: "A lone tent under the stars. Every empire starts somewhere.",      accent: "#78716c" },
  { tier: 2, minLevel: 5,  title: "Hamlet",     description: "A few huts and a training yard. Word of your discipline spreads.", accent: "#a3e635" },
  { tier: 3, minLevel: 10, title: "Village",    description: "A palisade, a forge, and your first loyal followers.",             accent: "#34d399" },
  { tier: 4, minLevel: 18, title: "Town",       description: "Stone walls rise. Merchants arrive, drawn by your renown.",        accent: "#22d3ee" },
  { tier: 5, minLevel: 28, title: "City",       description: "Banners fly from the gatehouse. Your name carries weight.",        accent: "#60a5fa" },
  { tier: 6, minLevel: 40, title: "Stronghold", description: "A fortress of iron and granite. Rivals think twice.",              accent: "#a78bfa" },
  { tier: 7, minLevel: 55, title: "Kingdom",    description: "A crown, a court, and lands as far as the eye can see.",           accent: "#f472b6" },
  { tier: 8, minLevel: 75, title: "Empire",     description: "Your legend spans the known world. The grind built this.",         accent: "#fbbf24" },
];

/** Highest tier unlocked at the given level. */
export function tierForLevel(level: number): KingdomTier {
  let current = KINGDOM_TIERS[0];
  for (const tier of KINGDOM_TIERS) {
    if (level >= tier.minLevel) current = tier;
  }
  return current;
}

/** The next tier to unlock, or null at max tier. */
export function nextTier(level: number): KingdomTier | null {
  return KINGDOM_TIERS.find((t) => t.minLevel > level) ?? null;
}
