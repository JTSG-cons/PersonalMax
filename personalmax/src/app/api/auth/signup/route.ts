import { NextResponse } from "next/server";
import { clientIp, jsonError, parseBody } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!rateLimit(`auth:${clientIp(request)}`, LIMITS.auth.limit, LIMITS.auth.windowMs)) {
    return jsonError("Too many attempts. Try again later.", 429);
  }

  const { data, error } = await parseBody(request, signupSchema);
  if (error) return error;

  const supabase = await createClient();
  const { data: result, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      // Consumed by the handle_new_user trigger to create profile + character.
      data: {
        username: data.username,
        display_name: data.displayName ?? data.username,
      },
    },
  });

  if (signUpError) {
    return jsonError(signUpError.message, signUpError.status ?? 400);
  }

  return NextResponse.json({
    // No session means the project requires email confirmation first.
    needsEmailConfirmation: !result.session,
  });
}
