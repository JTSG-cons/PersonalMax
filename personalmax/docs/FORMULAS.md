# PersonalMax formulas

Single reference for every deterministic rule in the app. The **authoritative
implementation lives in Postgres** (`supabase/migrations/…functions_policies.sql`,
inside `SECURITY DEFINER` functions) so no client — not even the Next.js
server — can forge game state. `src/lib/engine/` contains an exact TypeScript
mirror used for UI math and the unit-test suite (`tests/`), and the two are
spot-checked against each other in CI-able SQL checks.

Inputs to every formula are **real logged history only**: workout sessions,
sets, meals, accepted friendships, and resolved battles.

## Aggregates

| Symbol | Meaning |
| --- | --- |
| `vol` | Σ reps × weight_kg over all sets |
| `dur` | Σ session duration_minutes |
| `reps` | Σ reps over all sets |
| `sessions` | count of workout sessions |
| `activeDays` | distinct days with ≥1 workout |
| `mealDays` | distinct days with ≥1 meal |
| `meals` | total meals logged |
| `streak` | longest run of consecutive days with a workout **or** meal |
| `adherentDays` | days whose calorie total is within ±10% of the latest target |
| `wins` | battles won |
| `friends` | accepted friendships |

## Character stats (each clamped to 1–99)

```
strength   = 1 + floor(20 · log10(1 + vol/1000))
endurance  = 1 + floor(15 · log10(1 + dur/60)) + floor(10 · log10(1 + reps/500))
discipline = 1 + floor(2 · √(activeDays + mealDays)) + min(streak, 30)
vitality   = 1 + floor(3 · √mealDays) + floor(4 · √adherentDays)
```

Log/sqrt scales make early progress fast and grinding sustainable; no single
day of data entry can spike a stat.

## XP

```
workoutXp = Σ per session: 50 + min(floor(sessionVol/100), 50)   // 50–100 per session
mealXp    = Σ per day:     10 · min(mealsThatDay, 3)             // ≤30 per day
battleXp  = 25 · wins
awardXp   = Σ xp_bonus of unlocked awards
totalXp   = workoutXp + mealXp + battleXp + awardXp
```

## Leveling

```
xpForLevel(n)   = floor(100 · (n−1)^1.5)      // cumulative XP to reach level n
levelFromXp(xp) = max n with xpForLevel(n) ≤ xp   (capped at 500)
```

Level 2 at 100 XP, 5 at 800, 10 at 2 700, 20 at 8 276.

## Awards (server-evaluated; each grants its XP bonus once)

| Key | Condition | XP |
| --- | --- | --- |
| `first_workout` | sessions ≥ 1 | 50 |
| `week_streak` | streak ≥ 7 | 150 |
| `first_meal` | meals ≥ 1 | 25 |
| `first_battle_win` | wins ≥ 1 | 75 |
| `squad_five` | friends ≥ 5 | 100 |

## Kingdom tiers (cosmetic, level-gated)

Campsite 1 · Hamlet 5 · Village 10 · Town 18 · City 28 · Stronghold 40 ·
Kingdom 55 · Empire 75.

## Battles (asynchronous, resolved entirely in `rpc_resolve_battle`)

```
power = (0.35·STR + 0.25·END + 0.20·DIS + 0.20·VIT) · (1 + 0.02·level)
score = round(power · roll, 2)     roll ~ uniform[0.85, 1.15] per side (db random)
winner = higher score; ties go to the defender
```

Both scores and rolls are stored on the battle row for auditability. Winner
receives 25 XP (via recompute). Rate limit: a user can initiate at most 10
battles per hour, counted in the database.

## Nutrition target (deterministic rules table)

```
BMR  = 10·kg + 6.25·cm − 5·age + s        // Mifflin-St Jeor
        s: male +5, female −161, skipped → neutral average −78
        age optional, defaults to 30
TDEE = BMR · 1.5                           // fixed moderate-activity multiplier
calories = clamp(round(TDEE · goalFactor), 1200, 6000)
        goalFactor: cut 0.80, maintain 1.00, bulk 1.10

protein_g = round(kg · gPerKg)             // cut 2.2, maintain 1.8, bulk 2.0
fat_g     = round(0.25 · calories / 9)
carbs_g   = max(0, round((calories − 4·protein − 9·fat) / 4))
```

Biological sex is optional, only ever feeds the `s` constant above, and has no
effect anywhere else in the product (UI, character, copy).
