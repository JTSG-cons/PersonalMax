// Award catalog + unlock conditions. TypeScript mirror of the seeded awards
// table and the condition branch inside compute_progress (supabase/migrations).
// Unlocks are evaluated ONLY server-side; this mirror powers tests and UI copy.

export interface AwardDefinition {
  key: string;
  name: string;
  description: string;
  xpBonus: number;
  icon: string;
}

export const AWARDS: AwardDefinition[] = [
  {
    key: "first_workout",
    name: "First Blood",
    description: "Log your first workout session.",
    xpBonus: 50,
    icon: "dumbbell",
  },
  {
    key: "week_streak",
    name: "Iron Week",
    description: "Log a workout or meal 7 days in a row.",
    xpBonus: 150,
    icon: "flame",
  },
  {
    key: "first_meal",
    name: "Fuel Up",
    description: "Log your first meal.",
    xpBonus: 25,
    icon: "utensils",
  },
  {
    key: "first_battle_win",
    name: "Gladiator",
    description: "Win your first battle.",
    xpBonus: 75,
    icon: "swords",
  },
  {
    key: "squad_five",
    name: "Squad Goals",
    description: "Build a crew of 5 friends.",
    xpBonus: 100,
    icon: "users",
  },
];

export interface AwardCounters {
  sessionCount: number;
  longestStreak: number;
  mealCount: number;
  battlesWon: number;
  friendCount: number;
}

/** Returns the keys of all awards whose conditions are met. */
export function metAwardKeys(c: AwardCounters): string[] {
  const met: string[] = [];
  if (c.sessionCount >= 1) met.push("first_workout");
  if (c.longestStreak >= 7) met.push("week_streak");
  if (c.mealCount >= 1) met.push("first_meal");
  if (c.battlesWon >= 1) met.push("first_battle_win");
  if (c.friendCount >= 5) met.push("squad_five");
  return met;
}
