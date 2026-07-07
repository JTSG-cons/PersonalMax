import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { WorkoutEditor, type WorkoutDraft } from "@/components/workout-editor";
import { createClient } from "@/lib/supabase/server";
import type { WorkoutSessionRow } from "@/lib/types";

export const metadata: Metadata = { title: "Edit workout" };

// RLS restricts this query to the caller's own sessions: a guessed or foreign
// ID returns no rows and 404s.
export default async function WorkoutDetailPage(
  props: PageProps<"/workouts/[id]">,
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("workout_sessions")
    .select(
      "id, title, notes, performed_at, duration_minutes, created_at, workout_exercises(id, session_id, name, position, notes, workout_sets(id, exercise_id, set_number, reps, weight_kg, duration_seconds))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const session = data as WorkoutSessionRow;

  const performedLocal = new Date(session.performed_at);
  performedLocal.setMinutes(performedLocal.getMinutes() - performedLocal.getTimezoneOffset());

  const initial: WorkoutDraft = {
    title: session.title,
    notes: session.notes,
    performedAt: performedLocal.toISOString().slice(0, 16),
    durationMinutes:
      session.duration_minutes === null ? "" : String(session.duration_minutes),
    exercises: [...session.workout_exercises]
      .sort((a, b) => a.position - b.position)
      .map((exercise) => ({
        name: exercise.name,
        notes: exercise.notes,
        sets: [...exercise.workout_sets]
          .sort((a, b) => a.set_number - b.set_number)
          .map((set) => ({
            reps: String(set.reps),
            weightKg: String(Number(set.weight_kg)),
            durationSeconds:
              set.duration_seconds === null ? "" : String(set.duration_seconds),
          })),
      })),
  };

  return (
    <>
      <PageTitle title="Edit workout" subtitle="Fix the log or wipe the session." />
      <WorkoutEditor mode="edit" sessionId={session.id} initial={initial} />
    </>
  );
}
