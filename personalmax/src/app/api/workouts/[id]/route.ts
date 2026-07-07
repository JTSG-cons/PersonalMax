import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { workoutSessionSchema } from "@/lib/validation";
import { insertSessionChildren, recomputeProgress } from "@/lib/workouts";

const idSchema = z.uuid();

// Ownership: every query below is scoped to the caller both explicitly
// (.eq("user_id", user.id)) and by RLS. A guessed ID belonging to another
// user matches zero rows.

export async function PUT(request: Request, ctx: RouteContext<"/api/workouts/[id]">) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)) {
    return jsonError("Too many requests", 429);
  }

  const { id: rawId } = await ctx.params;
  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return jsonError("Invalid session id", 400);
  const id = idResult.data;

  const { data, error: parseError } = await parseBody(request, workoutSessionSchema);
  if (parseError) return parseError;

  const { data: updated, error: updateError } = await supabase
    .from("workout_sessions")
    .update({
      title: data.title,
      notes: data.notes,
      performed_at: data.performedAt,
      duration_minutes: data.durationMinutes ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (updateError) return jsonError(updateError.message, 500);
  if (!updated || updated.length === 0) return jsonError("Not found", 404);

  // Replace children wholesale (cascade removes the old sets).
  const { error: clearError } = await supabase
    .from("workout_exercises")
    .delete()
    .eq("session_id", id)
    .eq("user_id", user.id);
  if (clearError) return jsonError(clearError.message, 500);

  const { error: childError } = await insertSessionChildren(
    supabase,
    user,
    id,
    data.exercises,
  );
  if (childError) return jsonError(childError, 500);

  await recomputeProgress(supabase);
  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/workouts/[id]">) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { id: rawId } = await ctx.params;
  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return jsonError("Invalid session id", 400);

  const { data: deleted, error: deleteError } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", idResult.data)
    .eq("user_id", user.id)
    .select("id");

  if (deleteError) return jsonError(deleteError.message, 500);
  if (!deleted || deleted.length === 0) return jsonError("Not found", 404);

  await recomputeProgress(supabase);
  return NextResponse.json({ ok: true });
}
