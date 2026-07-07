// Deterministic workout plan generator.
//
// This is a rules-based template library — no opaque calls. The same inputs
// always produce the same plan, every table below is inspectable, and the
// whole generator is unit-tested (tests/workout-plan.test.ts).

export type PlanGoal = "strength" | "hypertrophy" | "endurance" | "general";
export type PlanExperience = "beginner" | "intermediate" | "advanced";
export type PlanSplit = "full_body" | "upper_lower" | "push_pull_legs" | "bro_split";

export interface PlanInput {
  goal: PlanGoal;
  experience: PlanExperience;
  daysPerWeek: number; // 1..7
  splitType: PlanSplit;
}

export interface PlannedExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
}

export interface PlannedDay {
  day: number; // 1-based training day number
  focus: string;
  exercises: PlannedExercise[];
}

export interface WorkoutPlan {
  goal: PlanGoal;
  experience: PlanExperience;
  daysPerWeek: number;
  splitType: PlanSplit;
  summary: string;
  days: PlannedDay[];
}

// --- rep schemes by goal ------------------------------------------------------
// [main lifts (first two slots), accessories (rest)]

interface RepScheme {
  sets: number;
  reps: string;
  restSeconds: number;
}

const SCHEMES: Record<PlanGoal, { main: RepScheme; accessory: RepScheme }> = {
  strength: {
    main: { sets: 5, reps: "5", restSeconds: 180 },
    accessory: { sets: 3, reps: "6-8", restSeconds: 120 },
  },
  hypertrophy: {
    main: { sets: 4, reps: "8-12", restSeconds: 90 },
    accessory: { sets: 3, reps: "10-15", restSeconds: 75 },
  },
  endurance: {
    main: { sets: 3, reps: "15-20", restSeconds: 60 },
    accessory: { sets: 3, reps: "15-25", restSeconds: 45 },
  },
  general: {
    main: { sets: 3, reps: "8-10", restSeconds: 90 },
    accessory: { sets: 3, reps: "10-12", restSeconds: 75 },
  },
};

// --- exercise pools by day focus ---------------------------------------------
// Order matters: pools are consumed deterministically from the front, with a
// per-day offset so repeated focus days differ across the week.

const POOLS: Record<string, string[]> = {
  "Full Body": [
    "Barbell Back Squat",
    "Barbell Bench Press",
    "Barbell Row",
    "Romanian Deadlift",
    "Overhead Press",
    "Lat Pulldown",
    "Dumbbell Lunge",
    "Plank",
  ],
  Upper: [
    "Barbell Bench Press",
    "Barbell Row",
    "Overhead Press",
    "Lat Pulldown",
    "Incline Dumbbell Press",
    "Face Pull",
    "Biceps Curl",
    "Triceps Pushdown",
  ],
  Lower: [
    "Barbell Back Squat",
    "Romanian Deadlift",
    "Leg Press",
    "Walking Lunge",
    "Leg Curl",
    "Standing Calf Raise",
    "Hanging Knee Raise",
    "Back Extension",
  ],
  Push: [
    "Barbell Bench Press",
    "Overhead Press",
    "Incline Dumbbell Press",
    "Dip",
    "Lateral Raise",
    "Triceps Pushdown",
    "Cable Fly",
    "Close-Grip Bench Press",
  ],
  Pull: [
    "Deadlift",
    "Pull-Up",
    "Barbell Row",
    "Seated Cable Row",
    "Face Pull",
    "Biceps Curl",
    "Hammer Curl",
    "Straight-Arm Pulldown",
  ],
  Legs: [
    "Barbell Back Squat",
    "Romanian Deadlift",
    "Leg Press",
    "Bulgarian Split Squat",
    "Leg Curl",
    "Leg Extension",
    "Standing Calf Raise",
    "Ab Wheel Rollout",
  ],
  Chest: [
    "Barbell Bench Press",
    "Incline Dumbbell Press",
    "Cable Fly",
    "Dip",
    "Machine Chest Press",
    "Push-Up",
  ],
  Back: [
    "Deadlift",
    "Pull-Up",
    "Barbell Row",
    "Seated Cable Row",
    "Lat Pulldown",
    "Face Pull",
  ],
  Shoulders: [
    "Overhead Press",
    "Lateral Raise",
    "Rear Delt Fly",
    "Arnold Press",
    "Upright Row",
    "Shrug",
  ],
  Arms: [
    "Barbell Curl",
    "Close-Grip Bench Press",
    "Hammer Curl",
    "Triceps Pushdown",
    "Incline Dumbbell Curl",
    "Overhead Triceps Extension",
  ],
  Core: [
    "Plank",
    "Hanging Knee Raise",
    "Ab Wheel Rollout",
    "Cable Crunch",
    "Side Plank",
    "Back Extension",
  ],
};

// --- split -> focus sequence ---------------------------------------------------

function focusSequence(split: PlanSplit, daysPerWeek: number): string[] {
  const cycles: Record<PlanSplit, string[]> = {
    full_body: ["Full Body"],
    upper_lower: ["Upper", "Lower"],
    push_pull_legs: ["Push", "Pull", "Legs"],
    bro_split: ["Chest", "Back", "Legs", "Shoulders", "Arms"],
  };
  const cycle = cycles[split];
  return Array.from({ length: daysPerWeek }, (_, i) => cycle[i % cycle.length]);
}

const EXERCISES_PER_DAY: Record<PlanExperience, number> = {
  beginner: 4,
  intermediate: 5,
  advanced: 6,
};

/** Deterministic pool slice: same focus on later days rotates the pool. */
function pickExercises(focus: string, count: number, repeatIndex: number): string[] {
  const pool = POOLS[focus];
  const offset = (repeatIndex * 2) % pool.length;
  return Array.from(
    { length: Math.min(count, pool.length) },
    (_, i) => pool[(offset + i) % pool.length],
  );
}

const SPLIT_LABELS: Record<PlanSplit, string> = {
  full_body: "Full Body",
  upper_lower: "Upper/Lower",
  push_pull_legs: "Push/Pull/Legs",
  bro_split: "Bro Split",
};

const GOAL_LABELS: Record<PlanGoal, string> = {
  strength: "strength",
  hypertrophy: "hypertrophy",
  endurance: "muscular endurance",
  general: "general fitness",
};

export function generateWorkoutPlan(input: PlanInput): WorkoutPlan {
  if (
    !Number.isInteger(input.daysPerWeek) ||
    input.daysPerWeek < 1 ||
    input.daysPerWeek > 7
  ) {
    throw new Error("daysPerWeek must be an integer between 1 and 7");
  }

  const scheme = SCHEMES[input.goal];
  const perDay = EXERCISES_PER_DAY[input.experience];
  const focuses = focusSequence(input.splitType, input.daysPerWeek);

  const seen = new Map<string, number>();
  const days: PlannedDay[] = focuses.map((focus, index) => {
    const repeatIndex = seen.get(focus) ?? 0;
    seen.set(focus, repeatIndex + 1);

    const names = pickExercises(focus, perDay, repeatIndex);
    const exercises: PlannedExercise[] = names.map((name, i) => {
      const s = i < 2 ? scheme.main : scheme.accessory;
      return { name, sets: s.sets, reps: s.reps, restSeconds: s.restSeconds };
    });

    return { day: index + 1, focus, exercises };
  });

  const summary =
    `${input.daysPerWeek}-day ${SPLIT_LABELS[input.splitType]} program for ` +
    `${GOAL_LABELS[input.goal]} (${input.experience}). ` +
    `First two lifts each day use ${scheme.main.sets}x${scheme.main.reps}; ` +
    `accessories use ${scheme.accessory.sets}x${scheme.accessory.reps}. ` +
    `Add weight when you hit the top of a rep range with good form.`;

  return { ...input, summary, days };
}
