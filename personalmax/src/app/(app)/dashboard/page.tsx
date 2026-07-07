import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass, Card, PageTitle, XpBar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { levelProgress } from "@/lib/engine/leveling";
import { tierForLevel } from "@/lib/engine/kingdom";
import { createClient } from "@/lib/supabase/server";
import type { CharacterRow, NutritionTargetRow } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: characterData },
    { data: profileData },
    { count: weekSessions },
    { data: todayMeals },
    { data: targetData },
    { count: awardCount },
  ] = await Promise.all([
    supabase.from("characters").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("username, display_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .gte("performed_at", weekAgo),
    supabase.from("meals").select("calories").eq("eaten_on", today),
    supabase
      .from("nutrition_targets")
      .select("calories")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("user_awards").select("award_key", { count: "exact", head: true }),
  ]);

  const character = characterData as CharacterRow | null;
  const target = targetData as Pick<NutritionTargetRow, "calories"> | null;
  const level = character?.level ?? 1;
  const xp = character?.xp ?? 0;
  const progress = levelProgress(xp);
  const tier = tierForLevel(level);
  const caloriesToday = (todayMeals ?? []).reduce((sum, m) => sum + (m.calories ?? 0), 0);

  return (
    <>
      <PageTitle
        title={`Welcome back, ${profileData?.display_name || profileData?.username || "athlete"}`}
        subtitle="Here's the state of your empire."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl border-2"
              style={{ borderColor: tier.accent, color: tier.accent }}
            >
              <Icon name="shield" className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold">{character?.name ?? "Adventurer"}</p>
              <p className="text-sm text-muted">
                Level {level} · {tier.title}
              </p>
            </div>
          </div>
          <p className="text-xl font-black text-gold">{xp.toLocaleString()} XP</p>
        </div>
        <div className="mt-4">
          <XpBar
            value={progress.intoLevel}
            max={progress.forNext}
            label={`Level ${level} → ${level + 1}`}
          />
        </div>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Workouts this week
          </p>
          <p className="mt-1 text-3xl font-black text-accent-soft">{weekSessions ?? 0}</p>
          <Link href="/workouts/new" className={`${buttonClass.primary} mt-3`}>
            <Icon name="plus" className="h-4 w-4" /> Log workout
          </Link>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Calories today
          </p>
          <p className="mt-1 text-3xl font-black text-accent-soft">
            {caloriesToday.toLocaleString()}
            {target ? (
              <span className="text-base font-semibold text-muted">
                {" "}
                / {target.calories.toLocaleString()}
              </span>
            ) : null}
          </p>
          <Link href="/nutrition" className={`${buttonClass.secondary} mt-3`}>
            <Icon name="utensils" className="h-4 w-4" /> Log a meal
          </Link>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Awards unlocked
          </p>
          <p className="mt-1 text-3xl font-black text-accent-soft">{awardCount ?? 0}/5</p>
          <Link href="/awards" className={`${buttonClass.secondary} mt-3`}>
            <Icon name="trophy" className="h-4 w-4" /> View awards
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Training plan</h2>
              <p className="mt-1 text-sm text-muted">
                Generate or review your weekly split.
              </p>
            </div>
            <Link href="/plan" className={buttonClass.secondary}>
              <Icon name="calendar" className="h-4 w-4" /> Open
            </Link>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Battle arena</h2>
              <p className="mt-1 text-sm text-muted">
                {character
                  ? `${character.battles_won} wins so far — challenge a friend.`
                  : "Challenge a friend."}
              </p>
            </div>
            <Link href="/battles" className={buttonClass.secondary}>
              <Icon name="swords" className="h-4 w-4" /> Fight
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
