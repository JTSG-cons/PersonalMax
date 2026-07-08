import { NextResponse } from "next/server";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { generateWorkoutPlan } from "@/lib/engine/workout-plan";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { workoutPlanInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)) {
    return jsonError("Too many requests", 429);
  }

  const { data, error: parseError } = await parseBody(request, workoutPlanInputSchema);
  if (parseError) return parseError;

  // Deterministic template output — generated server-side, never client-supplied.
  const plan = generateWorkoutPlan(data);

  const { data: row, error: insertError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: user.id,
      goal: data.goal,
      experience: data.experience,
      days_per_week: data.daysPerWeek,
      split_type: data.splitType,
      plan,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return jsonError(insertError?.message ?? "Failed to save plan", 500);
  }

  return NextResponse.json({ id: row.id, plan }, { status: 201 });
}
