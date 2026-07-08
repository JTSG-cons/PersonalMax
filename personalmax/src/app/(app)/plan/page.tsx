import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { WorkoutPlanRow } from "@/lib/types";
import { PlanGeneratorForm } from "./generator";

export const metadata: Metadata = { title: "Training plan" };

const SPLIT_LABELS: Record<string, string> = {
  full_body: "Full Body",
  upper_lower: "Upper/Lower",
  push_pull_legs: "Push/Pull/Legs",
  bro_split: "Bro Split",
};

export default async function PlanPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_plans")
    .select("id, goal, experience, days_per_week, split_type, plan, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latest = data as WorkoutPlanRow | null;

  return (
    <>
      <PageTitle
        title="Training plan"
        subtitle="Deterministic, template-based programming — same inputs, same plan."
      />

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Generate a weekly plan</h2>
        <PlanGeneratorForm />
      </Card>

      {latest ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">
              Current plan · {SPLIT_LABELS[latest.split_type] ?? latest.split_type}
            </h2>
            <p className="text-xs text-muted">
              Generated {new Date(latest.created_at).toLocaleDateString()}
            </p>
          </div>
          <p className="text-sm text-muted">{latest.plan.summary}</p>

          <div className="grid gap-4 md:grid-cols-2">
            {latest.plan.days.map((day) => (
              <Card key={day.day}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Day {day.day}</h3>
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-soft">
                    {day.focus}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th className="pb-2 font-semibold">Exercise</th>
                      <th className="pb-2 font-semibold">Sets × Reps</th>
                      <th className="pb-2 text-right font-semibold">Rest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.exercises.map((exercise) => (
                      <tr key={exercise.name} className="border-t border-edge/60">
                        <td className="py-2 pr-2">{exercise.name}</td>
                        <td className="py-2 pr-2 text-muted">
                          {exercise.sets} × {exercise.reps}
                        </td>
                        <td className="py-2 text-right text-muted">{exercise.restSeconds}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted">
          No plan yet — pick your goal, experience, training days, and split above.
        </p>
      )}
    </>
  );
}
