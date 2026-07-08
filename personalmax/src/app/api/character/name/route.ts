import { NextResponse } from "next/server";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { characterNameSchema } from "@/lib/validation";

// The character's NAME is the only client-writable field on the row: the
// database grants UPDATE on that single column, and RLS restricts it to the
// owner. Stats/XP/level cannot be written through any API.
export async function PATCH(request: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)) {
    return jsonError("Too many requests", 429);
  }

  const { data, error: parseError } = await parseBody(request, characterNameSchema);
  if (parseError) return parseError;

  const { data: updated, error: updateError } = await supabase
    .from("characters")
    .update({ name: data.name })
    .eq("user_id", user.id)
    .select("user_id");

  if (updateError) return jsonError(updateError.message, 500);
  if (!updated || updated.length === 0) return jsonError("Character not found", 404);

  return NextResponse.json({ ok: true });
}
