import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";
import type { workoutSessionSchema } from "@/lib/validation";

type SessionInput = z.infer<typeof workoutSessionSchema>;

// Inserts the exercise/set children of a session. Rows are written through
// the caller's RLS-scoped client, so ownership is enforced by the database
// on every row (user_id must equal auth.uid()).
export async function insertSessionChildren(
  supabase: SupabaseClient,
  user: User,
  sessionId: string,
  exercises: SessionInput["exercises"],
): Promise<{ error: string | null }> {
  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("workout_exercises")
    .insert(
      exercises.map((exercise, index) => ({
        user_id: user.id,
        session_id: sessionId,
        name: exercise.name,
        notes: exercise.notes,
        position: index,
      })),
    )
    .select("id");

  if (exerciseError || !exerciseRows || exerciseRows.length !== exercises.length) {
    return { error: exerciseError?.message ?? "Failed to save exercises" };
  }

  const setRows = exercises.flatMap((exercise, exerciseIndex) =>
    exercise.sets.map((set, setIndex) => ({
      user_id: user.id,
      session_id: sessionId,
      exercise_id: exerciseRows[exerciseIndex].id,
      set_number: setIndex + 1,
      reps: set.reps,
      weight_kg: set.weightKg,
      duration_seconds: set.durationSeconds ?? null,
    })),
  );

  const { error: setError } = await supabase.from("workout_sets").insert(setRows);
  if (setError) {
    return { error: setError.message };
  }
  return { error: null };
}

// Recompute stats/XP/awards after any history mutation. Runs as the calling
// user via the SECURITY DEFINER RPC — the database is the authority.
export async function recomputeProgress(supabase: SupabaseClient): Promise<void> {
  await supabase.rpc("rpc_recompute_my_progress");
}
