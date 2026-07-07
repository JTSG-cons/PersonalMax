// Battle resolution. TypeScript mirror of the authoritative SQL in
// rpc_resolve_battle (supabase/migrations). See docs/FORMULAS.md.
//
// Battles are asynchronous: the server compares both characters' current
// stats with a bounded random factor per side. The random roll is generated
// in the database; this mirror takes rolls as inputs so it is fully
// deterministic and testable.

export interface Combatant {
  userId: string;
  level: number;
  strength: number;
  endurance: number;
  discipline: number;
  vitality: number;
}

export const ROLL_MIN = 0.85;
export const ROLL_MAX = 1.15;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Base battle power before the random roll. */
export function battlePower(c: Combatant): number {
  return (
    (0.35 * c.strength + 0.25 * c.endurance + 0.2 * c.discipline + 0.2 * c.vitality) *
    (1 + 0.02 * c.level)
  );
}

export interface BattleOutcome {
  winnerId: string;
  challengerScore: number;
  opponentScore: number;
}

/**
 * Resolve a battle given both sides and their rolls (each in
 * [ROLL_MIN, ROLL_MAX]). Ties go to the defender (opponent).
 */
export function resolveBattle(
  challenger: Combatant,
  opponent: Combatant,
  challengerRoll: number,
  opponentRoll: number,
): BattleOutcome {
  const challengerScore = round2(battlePower(challenger) * challengerRoll);
  const opponentScore = round2(battlePower(opponent) * opponentRoll);
  return {
    winnerId: challengerScore > opponentScore ? challenger.userId : opponent.userId,
    challengerScore,
    opponentScore,
  };
}
