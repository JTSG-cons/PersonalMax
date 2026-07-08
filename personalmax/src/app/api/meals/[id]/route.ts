import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireUser } from "@/lib/api";
import { recomputeProgress } from "@/lib/workouts";

const idSchema = z.uuid();

export async function DELETE(_request: Request, ctx: RouteContext<"/api/meals/[id]">) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { id: rawId } = await ctx.params;
  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return jsonError("Invalid meal id", 400);

  const { data: deleted, error: deleteError } = await supabase
    .from("meals")
    .delete()
    .eq("id", idResult.data)
    .eq("user_id", user.id)
    .select("id");

  if (deleteError) return jsonError(deleteError.message, 500);
  if (!deleted || deleted.length === 0) return jsonError("Not found", 404);

  await recomputeProgress(supabase);
  return NextResponse.json({ ok: true });
}
