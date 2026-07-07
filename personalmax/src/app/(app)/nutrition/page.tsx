import type { Metadata } from "next";
import { Card, PageTitle, XpBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { MealRow, NutritionTargetRow } from "@/lib/types";
import { MealLogForm, MealRowActions, TargetGeneratorForm } from "./forms";

export const metadata: Metadata = { title: "Nutrition" };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function NutritionPage() {
  const supabase = await createClient();
  const today = todayIso();

  const [{ data: targetData }, { data: mealData }] = await Promise.all([
    supabase
      .from("nutrition_targets")
      .select(
        "id, bodyweight_kg, height_cm, age, sex, goal, calories, protein_g, carbs_g, fat_g, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meals")
      .select("id, name, calories, protein_g, carbs_g, fat_g, eaten_on, created_at")
      .eq("eaten_on", today)
      .order("created_at", { ascending: true }),
  ]);

  const target = targetData as NutritionTargetRow | null;
  const meals = (mealData ?? []) as MealRow[];

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein_g,
      carbs: acc.carbs + meal.carbs_g,
      fat: acc.fat + meal.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <>
      <PageTitle
        title="Nutrition"
        subtitle="Set a daily target, then log what you actually eat."
      />

      <Card className="mb-6">
        <h2 className="mb-1 font-semibold">Daily target</h2>
        <p className="mb-4 text-xs text-muted">
          BMR-based (Mifflin-St Jeor). Biological sex is optional — skip it and a
          neutral average is used. It only affects this calorie math, nothing else.
        </p>
        <TargetGeneratorForm
          initial={
            target
              ? {
                  bodyweightKg: String(Number(target.bodyweight_kg)),
                  heightCm: String(Number(target.height_cm)),
                  age: target.age === null ? "" : String(target.age),
                  sex: target.sex ?? "",
                  goal: target.goal,
                }
              : null
          }
        />
      </Card>

      {target ? (
        <Card className="mb-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              Today · {totals.calories.toLocaleString()} / {target.calories.toLocaleString()} kcal
            </h2>
            <span className="text-xs uppercase tracking-wide text-muted">
              goal: {target.goal}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <XpBar value={totals.calories} max={target.calories} label="Calories" />
            <XpBar value={totals.protein} max={target.protein_g} label={`Protein ${totals.protein}/${target.protein_g}g`} />
            <XpBar value={totals.carbs} max={target.carbs_g} label={`Carbs ${totals.carbs}/${target.carbs_g}g`} />
            <XpBar value={totals.fat} max={target.fat_g} label={`Fat ${totals.fat}/${target.fat_g}g`} />
          </div>
        </Card>
      ) : (
        <p className="mb-6 text-sm text-muted">
          Generate a target above to start tracking your day against it.
        </p>
      )}

      <Card>
        <h2 className="mb-4 font-semibold">Log a meal</h2>
        <MealLogForm today={today} />

        {meals.length > 0 ? (
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 font-semibold">Meal</th>
                <th className="pb-2 text-right font-semibold">kcal</th>
                <th className="pb-2 text-right font-semibold">P</th>
                <th className="pb-2 text-right font-semibold">C</th>
                <th className="pb-2 text-right font-semibold">F</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {meals.map((meal) => (
                <tr key={meal.id} className="border-t border-edge/60">
                  <td className="max-w-40 truncate py-2 pr-2 sm:max-w-none">{meal.name}</td>
                  <td className="py-2 text-right">{meal.calories}</td>
                  <td className="py-2 text-right text-muted">{meal.protein_g}g</td>
                  <td className="py-2 text-right text-muted">{meal.carbs_g}g</td>
                  <td className="py-2 text-right text-muted">{meal.fat_g}g</td>
                  <td className="py-2 text-right">
                    <MealRowActions mealId={meal.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-4 text-sm text-muted">Nothing logged today yet.</p>
        )}
      </Card>
    </>
  );
}
