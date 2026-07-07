import { NextResponse } from "next/server";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { computeNutritionTarget } from "@/lib/engine/meal-plan";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { nutritionInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  if (!rateLimit(`write:${user.id}`, LIMITS.write.limit, LIMITS.write.windowMs)) {
    return jsonError("Too many requests", 429);
  }

  const { data, error: parseError } = await parseBody(request, nutritionInputSchema);
  if (parseError) return parseError;

  // Deterministic rules table — computed server-side, never client-supplied.
  const target = computeNutritionTarget({
    bodyweightKg: data.bodyweightKg,
    heightCm: data.heightCm,
    age: data.age ?? null,
    sex: data.sex ?? null,
    goal: data.goal,
  });

  const { data: row, error: insertError } = await supabase
    .from("nutrition_targets")
    .insert({
      user_id: user.id,
      bodyweight_kg: data.bodyweightKg,
      height_cm: data.heightCm,
      age: data.age ?? null,
      sex: data.sex ?? null,
      goal: data.goal,
      calories: target.calories,
      protein_g: target.proteinG,
      carbs_g: target.carbsG,
      fat_g: target.fatG,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return jsonError(insertError?.message ?? "Failed to save target", 500);
  }

  return NextResponse.json({ id: row.id, target }, { status: 201 });
}
