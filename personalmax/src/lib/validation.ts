import { z } from "zod";

// Shared server-side input schemas. Every mutation endpoint parses its body
// with one of these before touching the database; DB CHECK constraints mirror
// the same bounds as defense in depth.

// Reject ASCII control characters (except \n and \t in multi-line fields).
const SINGLE_LINE = /^[^\u0000-\u001F\u007F]*$/;
const MULTI_LINE = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/;

const line = (min: number, max: number) =>
  z.string().trim().min(min).max(max).regex(SINGLE_LINE, "Contains invalid characters");

const text = (max: number) =>
  z.string().trim().max(max).regex(MULTI_LINE, "Contains invalid characters").default("");

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,20}$/, "3-20 letters, numbers, or underscores");

export const signupSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8, "At least 8 characters").max(72),
  username: usernameSchema,
  displayName: line(0, 40).optional(),
});

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(72),
});

// --- workouts ---------------------------------------------------------------

export const workoutSetSchema = z.object({
  reps: z.int().min(0).max(1000),
  weightKg: z.number().min(0).max(2000),
  durationSeconds: z.int().min(0).max(86400).nullish(),
});

export const workoutExerciseSchema = z.object({
  name: line(1, 80),
  notes: text(500),
  sets: z.array(workoutSetSchema).min(1).max(50),
});

export const workoutSessionSchema = z.object({
  title: line(1, 80),
  notes: text(1000),
  performedAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.int().min(0).max(1440).nullish(),
  exercises: z.array(workoutExerciseSchema).min(1).max(20),
});

// --- workout plan generator ---------------------------------------------------

export const planGoalSchema = z.enum(["strength", "hypertrophy", "endurance", "general"]);
export const planExperienceSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const planSplitSchema = z.enum(["full_body", "upper_lower", "push_pull_legs", "bro_split"]);

export const workoutPlanInputSchema = z.object({
  goal: planGoalSchema,
  experience: planExperienceSchema,
  daysPerWeek: z.int().min(1).max(7),
  splitType: planSplitSchema,
});

// --- nutrition ----------------------------------------------------------------

// sex is optional by design and is used ONLY in the calorie formula
// (neutral average when omitted). It never affects anything else in the app.
export const nutritionInputSchema = z.object({
  bodyweightKg: z.number().min(30).max(400),
  heightCm: z.number().min(100).max(250),
  age: z.int().min(13).max(100).nullish(),
  sex: z.enum(["male", "female"]).nullish(),
  goal: z.enum(["cut", "maintain", "bulk"]),
});

export const mealSchema = z.object({
  name: line(1, 120),
  calories: z.int().min(0).max(10000),
  proteinG: z.int().min(0).max(1000),
  carbsG: z.int().min(0).max(1000),
  fatG: z.int().min(0).max(1000),
  eatenOn: z.iso.date(),
});

// --- character / social ---------------------------------------------------------

export const characterNameSchema = z.object({
  name: line(1, 30),
});

export const friendRequestSchema = z.object({
  username: usernameSchema,
});

export const friendActionSchema = z.object({
  action: z.enum(["accept", "reject", "remove"]),
});

export const battleChallengeSchema = z.object({
  opponentId: z.uuid(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(0).max(10000).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
