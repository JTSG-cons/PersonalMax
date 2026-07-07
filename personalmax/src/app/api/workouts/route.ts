import { NextResponse } from "next/server";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { workoutSessionSchema } from "@/lib/validation";
import { insertSessionChildren, recomputeProgress } from "@/lib/workouts";

export async function POST(request: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)) {
    return jsonError("Too many requests", 429);
  }

  const { data, error: parseError } = await parseBody(request, workoutSessionSchema);
  if (parseError) return parseError;

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      title: data.title,
      notes: data.notes,
      performed_at: data.performedAt,
      duration_minutes: data.durationMinutes ?? null,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return jsonError(sessionError?.message ?? "Failed to create session", 500);
  }

  const { error: childError } = await insertSessionChildren(
    supabase,
    user,
    session.id,
    data.exercises,
  );
  if (childError) {
    // Best-effort cleanup so a half-written session doesn't linger.
    await supabase.from("workout_sessions").delete().eq("id", session.id);
    return jsonError(childError, 500);
  }

  await recomputeProgress(supabase);
  return NextResponse.json({ id: session.id }, { status: 201 });
}
