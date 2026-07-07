import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass, Card, EmptyState, PageTitle } from "@/components/ui";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import type { WorkoutSessionRow } from "@/lib/types";

export const metadata: Metadata = { title: "Workouts" };

function sessionVolume(session: WorkoutSessionRow): number {
  return session.workout_exercises.reduce(
    (total, exercise) =>
      total +
      exercise.workout_sets.reduce((sum, set) => sum + set.reps * Number(set.weight_kg), 0),
    0,
  );
}

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select(
      "id, title, notes, performed_at, duration_minutes, created_at, workout_exercises(id, session_id, name, position, notes, workout_sets(id, exercise_id, set_number, reps, weight_kg, duration_seconds))",
    )
    .order("performed_at", { ascending: false })
    .limit(50);

  const sessions = (data ?? []) as WorkoutSessionRow[];

  return (
    <>
      <PageTitle
        title="Workouts"
        subtitle="Every session logged makes your character stronger."
        action={
          <Link href="/workouts/new" className={buttonClass.primary}>
            <Icon name="plus" className="h-4 w-4" /> Log workout
          </Link>
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          title="No workouts yet"
          hint="Log your first session to earn the First Blood award and 50+ XP."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const volume = sessionVolume(session);
            const sets = session.workout_exercises.reduce(
              (n, ex) => n + ex.workout_sets.length,
              0,
            );
            return (
              <Link key={session.id} href={`/workouts/${session.id}`} className="block">
                <Card className="transition hover:border-accent">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{session.title}</h2>
                      <p className="mt-0.5 text-sm text-muted">
                        {new Date(session.performed_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {session.duration_minutes
                          ? ` · ${session.duration_minutes} min`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted">
                      <p>
                        {session.workout_exercises.length} exercises · {sets} sets
                      </p>
                      <p className="font-semibold text-accent-soft">
                        {Math.round(volume).toLocaleString()} kg volume
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
