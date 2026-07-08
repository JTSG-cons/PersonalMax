import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadSocialGraph } from "@/lib/social";
import type { BattleRow, ProfileRow } from "@/lib/types";
import { ChallengeForm } from "./challenge";

export const metadata: Metadata = { title: "Battles" };

export default async function BattlesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const graph = await loadSocialGraph(supabase, user.id);

  const { data: battleData } = await supabase
    .from("battles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  const battles = (battleData ?? []) as BattleRow[];

  // Opponent names: friends are visible via RLS; ex-friends may not be.
  const opponentIds = [
    ...new Set(
      battles.map((b) => (b.challenger_id === user.id ? b.opponent_id : b.challenger_id)),
    ),
  ];
  const profiles = new Map<string, ProfileRow>();
  if (opponentIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", opponentIds);
    for (const p of (profileData ?? []) as ProfileRow[]) profiles.set(p.id, p);
  }

  return (
    <>
      <PageTitle
        title="Battles"
        subtitle="Asynchronous stat duels — resolved by the server, luck within ±15%."
      />

      <Card className="mb-6">
        <h2 className="mb-1 font-semibold">Challenge a friend</h2>
        <p className="mb-4 text-xs text-muted">
          Power = weighted stats × level. Winner takes 25 XP. Max 10 challenges per hour.
        </p>
        {graph.accepted.length === 0 ? (
          <p className="text-sm text-muted">
            You need{" "}
            <Link href="/friends" className="text-accent-soft hover:underline">
              friends
            </Link>{" "}
            before you can battle.
          </p>
        ) : (
          <ChallengeForm
            friends={graph.accepted.map((f) => ({
              id: f.profile.id,
              label: `${f.profile.display_name} (@${f.profile.username})`,
            }))}
          />
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Battle history
        </h2>
        {battles.length === 0 ? (
          <EmptyState
            title="No battles yet"
            hint="Win your first battle to unlock the Gladiator award."
          />
        ) : (
          <div className="space-y-2">
            {battles.map((battle) => {
              const iAmChallenger = battle.challenger_id === user.id;
              const opponentId = iAmChallenger ? battle.opponent_id : battle.challenger_id;
              const opponent = profiles.get(opponentId);
              const won = battle.winner_id === user.id;
              const myScore = iAmChallenger ? battle.challenger_score : battle.opponent_score;
              const theirScore = iAmChallenger ? battle.opponent_score : battle.challenger_score;
              return (
                <Card key={battle.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <span className={won ? "text-win" : "text-danger"}>
                        {won ? "Victory" : "Defeat"}
                      </span>{" "}
                      vs {opponent ? `@${opponent.username}` : "a former rival"}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(battle.created_at).toLocaleString()} ·{" "}
                      {iAmChallenger ? "you challenged" : "challenged you"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm">
                      <span className={won ? "text-win" : "text-ink"}>{Number(myScore).toFixed(2)}</span>
                      <span className="text-muted"> vs </span>
                      <span className={won ? "text-ink" : "text-danger"}>{Number(theirScore).toFixed(2)}</span>
                    </p>
                    {won ? (
                      <p className="text-xs font-semibold text-gold">+{battle.xp_awarded} XP</p>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
