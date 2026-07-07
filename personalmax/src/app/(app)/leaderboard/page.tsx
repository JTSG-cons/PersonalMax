import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass, Card, EmptyState, PageTitle } from "@/components/ui";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { loadSocialGraph } from "@/lib/social";
import type { CharacterRow, ProfileRow } from "@/lib/types";

export const metadata: Metadata = { title: "Leaderboard" };

const PAGE_SIZE = 10;

// Friends-scoped ranking: RLS only exposes characters of the caller and
// accepted friends, so this can never leak a stranger's data.
export default async function LeaderboardPage(props: PageProps<"/leaderboard">) {
  const searchParams = await props.searchParams;
  const rawPage = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const page = Math.max(0, Number.parseInt(rawPage ?? "0", 10) || 0);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const graph = await loadSocialGraph(supabase, user.id);
  const memberIds = [user.id, ...graph.acceptedIds];

  const { data: characterData, count } = await supabase
    .from("characters")
    .select("*", { count: "exact" })
    .in("user_id", memberIds)
    .order("level", { ascending: false })
    .order("xp", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const characters = (characterData ?? []) as CharacterRow[];
  const total = count ?? characters.length;

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", memberIds);
  const profiles = new Map(
    ((profileData ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );

  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  return (
    <>
      <PageTitle
        title="Leaderboard"
        subtitle="You and your friends, ranked by level and XP."
      />

      {characters.length === 0 ? (
        <EmptyState
          title="Nobody to rank yet"
          hint="Add friends to see how your grind stacks up."
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-3 font-semibold">#</th>
                <th className="pb-3 font-semibold">Hero</th>
                <th className="pb-3 text-right font-semibold">Level</th>
                <th className="pb-3 text-right font-semibold">XP</th>
                <th className="hidden pb-3 text-right font-semibold sm:table-cell">Battles</th>
              </tr>
            </thead>
            <tbody>
              {characters.map((character, index) => {
                const profile = profiles.get(character.user_id);
                const rank = page * PAGE_SIZE + index + 1;
                const isMe = character.user_id === user.id;
                return (
                  <tr
                    key={character.user_id}
                    className={`border-t border-edge/60 ${isMe ? "bg-accent/10" : ""}`}
                  >
                    <td className="py-3 pr-2 font-black text-muted">
                      {rank <= 3 ? (
                        <Icon
                          name="trophy"
                          className={`h-5 w-5 ${
                            rank === 1 ? "text-gold" : rank === 2 ? "text-ink" : "text-accent-soft"
                          }`}
                        />
                      ) : (
                        rank
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <p className="font-semibold">
                        {character.name}
                        {isMe ? <span className="ml-2 text-xs text-accent-soft">you</span> : null}
                      </p>
                      <p className="text-xs text-muted">
                        @{profile?.username ?? "unknown"}
                      </p>
                    </td>
                    <td className="py-3 text-right text-lg font-bold text-accent-soft">
                      {character.level}
                    </td>
                    <td className="py-3 text-right text-muted">
                      {character.xp.toLocaleString()}
                    </td>
                    <td className="hidden py-3 text-right text-muted sm:table-cell">
                      {character.battles_won}W / {character.battles_fought - character.battles_won}L
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {hasPrev || hasNext ? (
        <div className="mt-4 flex justify-between">
          {hasPrev ? (
            <Link href={`/leaderboard?page=${page - 1}`} className={buttonClass.secondary}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link href={`/leaderboard?page=${page + 1}`} className={buttonClass.secondary}>
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
