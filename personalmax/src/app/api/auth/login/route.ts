import { NextResponse } from "next/server";
import { clientIp, jsonError, parseBody } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!rateLimit(`auth:${clientIp(request)}`, LIMITS.auth.limit, LIMITS.auth.windowMs)) {
    return jsonError("Too many attempts. Try again later.", 429);
  }

  const { data, error } = await parseBody(request, loginSchema);
  if (error) return error;

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (signInError) {
    // Uniform message: don't reveal whether the email exists.
    return jsonError("Invalid email or password", 401);
  }

  return NextResponse.json({ ok: true });
}
