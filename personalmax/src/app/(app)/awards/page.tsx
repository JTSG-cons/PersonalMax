import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import type { AwardRow, UserAwardRow } from "@/lib/types";

export const metadata: Metadata = { title: "Awards" };

const AWARD_ICONS: Record<string, IconName> = {
  dumbbell: "dumbbell",
  flame: "flame",
  utensils: "utensils",
  swords: "swords",
  users: "users",
};

// Unlocks are evaluated exclusively in the database (compute_progress);
// this page just renders the results.
export default async function AwardsPage() {
  const supabase = await createClient();

  const [{ data: awardData }, { data: unlockData }] = await Promise.all([
    supabase.from("awards").select("*").order("sort", { ascending: true }),
    supabase.from("user_awards").select("award_key, unlocked_at"),
  ]);

  const awards = (awardData ?? []) as AwardRow[];
  const unlocked = new Map(
    ((unlockData ?? []) as UserAwardRow[]).map((u) => [u.award_key, u.unlocked_at]),
  );

  return (
    <>
      <PageTitle
        title="Awards"
        subtitle={`${unlocked.size} of ${awards.length} unlocked — each grants bonus XP.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {awards.map((award) => {
          const unlockedAt = unlocked.get(award.key);
          return (
            <Card
              key={award.key}
              className={unlockedAt ? "border-gold/40" : "opacity-60"}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    unlockedAt ? "bg-gold/15 text-gold" : "bg-raised text-muted"
                  }`}
                >
                  <Icon name={AWARD_ICONS[award.icon] ?? "trophy"} className="h-6 w-6" />
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    unlockedAt ? "bg-gold/15 text-gold" : "bg-raised text-muted"
                  }`}
                >
                  +{award.xp_bonus} XP
                </span>
              </div>
              <h2 className="mt-3 font-semibold">{award.name}</h2>
              <p className="mt-1 text-sm text-muted">{award.description}</p>
              <p className="mt-3 text-xs font-medium">
                {unlockedAt ? (
                  <span className="text-win">
                    Unlocked {new Date(unlockedAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-muted">Locked</span>
                )}
              </p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
