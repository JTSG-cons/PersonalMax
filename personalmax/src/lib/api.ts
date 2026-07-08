import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Every API route starts here: resolves the caller from the session cookie
// and returns an RLS-scoped Supabase client acting as that user.
export async function requireUser(): Promise<
  | { user: User; supabase: SupabaseClient; error: null }
  | { user: null; supabase: null; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, supabase: null, error: jsonError("Unauthorized", 401) };
  }
  return { user, supabase, error: null };
}

// Server-side input validation for all mutations. Never trust the client.
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, error: jsonError("Invalid JSON body", 400) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path?.length ? ` (${first.path.join(".")})` : "";
    return {
      data: null,
      error: jsonError(`${first?.message ?? "Invalid input"}${path}`, 400),
    };
  }
  return { data: result.data, error: null };
}

// Best-effort client IP for rate limiting. Prefer `x-real-ip` (set, not
// appended, by a trusted reverse proxy) over the first `x-forwarded-for` hop,
// which is fully client-controlled. This value is spoofable when the app is
// not deployed behind a proxy that overwrites these headers, so IP-based auth
// limiting is layered with per-account limiting (see the auth routes) and
// Supabase Auth's own server-side limits — never rely on it alone.
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
