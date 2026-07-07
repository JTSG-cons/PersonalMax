import { NextResponse } from "next/server";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { mealSchema } from "@/lib/validation";
import { recomputeProgress } from "@/lib/workouts";

export async function POST(request: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)) {
    return jsonError("Too many requests", 429);
  }

  const { data, error: parseError } = await parseBody(request, mealSchema);
  if (parseError) return parseError;

  const { data: row, error: insertError } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      name: data.name,
      calories: data.calories,
      protein_g: data.proteinG,
      carbs_g: data.carbsG,
      fat_g: data.fatG,
      eaten_on: data.eatenOn,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return jsonError(insertError?.message ?? "Failed to log meal", 500);
  }

  await recomputeProgress(supabase);
  return NextResponse.json({ id: row.id }, { status: 201 });
}
