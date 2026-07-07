import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { friendActionSchema } from "@/lib/validation";
import { recomputeProgress } from "@/lib/workouts";

const idSchema = z.uuid();

// accept: only the addressee of a pending request (enforced by the RLS
//         update policy on top of the explicit checks here).
// reject/remove: either participant deletes the row.
export async function PATCH(request: Request, ctx: RouteContext<"/api/friends/[id]">) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)) {
    return jsonError("Too many requests", 429);
  }

  const { id: rawId } = await ctx.params;
  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return jsonError("Invalid friendship id", 400);
  const id = idResult.data;

  const { data, error: parseError } = await parseBody(request, friendActionSchema);
  if (parseError) return parseError;

  // RLS select policy scopes this to rows the caller participates in.
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!friendship) return jsonError("Not found", 404);

  if (data.action === "accept") {
    if (friendship.addressee_id !== user.id || friendship.status !== "pending") {
      return jsonError("Only the recipient can accept a pending request", 403);
    }
    const { data: updated, error: updateError } = await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", id)
      .eq("addressee_id", user.id)
      .eq("status", "pending")
      .select("id");
    if (updateError) return jsonError(updateError.message, 500);
    if (!updated || updated.length === 0) return jsonError("Not found", 404);

    // Friend counts feed the Squad Goals award for both sides.
    await recomputeProgress(supabase);
    return NextResponse.json({ ok: true });
  }

  // reject (pending) or remove (accepted): both delete the row.
  const { data: deleted, error: deleteError } = await supabase
    .from("friendships")
    .delete()
    .eq("id", id)
    .select("id");
  if (deleteError) return jsonError(deleteError.message, 500);
  if (!deleted || deleted.length === 0) return jsonError("Not found", 404);

  return NextResponse.json({ ok: true });
}
