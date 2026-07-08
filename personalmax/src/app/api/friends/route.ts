import { NextResponse } from "next/server";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { friendRequestSchema } from "@/lib/validation";

// Send a friend request by exact username. The lookup RPC returns only
// (id, username, display_name) for an exact match — no enumeration. The
// insert goes through the caller's RLS-scoped client, whose policy forces
// requester_id = auth.uid() and status = 'pending'.
export async function POST(request: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)) {
    return jsonError("Too many requests", 429);
  }

  const { data, error: parseError } = await parseBody(request, friendRequestSchema);
  if (parseError) return parseError;

  const { data: matches, error: lookupError } = await supabase.rpc(
    "rpc_lookup_profile",
    { p_username: data.username },
  );
  if (lookupError) return jsonError(lookupError.message, 500);

  const target = Array.isArray(matches) ? matches[0] : null;
  if (!target) return jsonError("No user with that username", 404);
  if (target.id === user.id) return jsonError("That's you — try a friend's username", 400);

  const { error: insertError } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: target.id,
    status: "pending",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return jsonError("A request or friendship with this user already exists", 409);
    }
    return jsonError(insertError.message, 500);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
