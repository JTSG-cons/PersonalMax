import { NextResponse } from "next/server";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { battleChallengeSchema } from "@/lib/validation";

// Challenge a friend. The ENTIRE battle — friendship check, per-hour rate
// limit, stat comparison, bounded random rolls, result row, XP — is resolved
// inside the SECURITY DEFINER rpc_resolve_battle as the calling user. This
// route just validates input and translates database errors to HTTP.
export async function POST(request: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  // In-memory limiter in front of the authoritative in-database limit.
  if (!rateLimit(`battle:${user.id}`, LIMITS.battle.limit, LIMITS.battle.windowMs)) {
    return jsonError("Battle limit reached — try again in an hour", 429);
  }

  const { data, error: parseError } = await parseBody(request, battleChallengeSchema);
  if (parseError) return parseError;

  const { data: result, error: rpcError } = await supabase.rpc("rpc_resolve_battle", {
    p_opponent: data.opponentId,
  });

  if (rpcError) {
    const message = rpcError.message ?? "";
    if (message.includes("rate_limited")) {
      return jsonError("Battle limit reached — try again in an hour", 429);
    }
    if (message.includes("not_friends")) {
      return jsonError("You can only battle accepted friends", 403);
    }
    if (message.includes("invalid_opponent")) {
      return jsonError("Invalid opponent", 400);
    }
    if (message.includes("character_missing")) {
      return jsonError("Opponent has no character yet", 409);
    }
    return jsonError("Battle failed", 500);
  }

  const battle = Array.isArray(result) ? result[0] : result;
  if (!battle) return jsonError("Battle failed", 500);

  return NextResponse.json({ battle }, { status: 201 });
}
