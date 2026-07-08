import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadSocialGraph } from "@/lib/social";
import { AddFriendForm, FriendActions } from "./actions";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const graph = await loadSocialGraph(supabase, user.id);

  return (
    <>
      <PageTitle
        title="Friends"
        subtitle="Build your crew — 5 friends unlocks the Squad Goals award."
      />

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Add a friend</h2>
        <AddFriendForm />
      </Card>

      {graph.incoming.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Incoming requests
          </h2>
          <div className="space-y-2">
            {graph.incoming.map((entry) => (
              <Card key={entry.friendshipId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.profile.display_name}</p>
                  <p className="truncate text-sm text-muted">@{entry.profile.username}</p>
                </div>
                <FriendActions friendshipId={entry.friendshipId} kind="incoming" />
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {graph.outgoing.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Sent requests
          </h2>
          <div className="space-y-2">
            {graph.outgoing.map((entry) => (
              <Card key={entry.friendshipId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.profile.display_name}</p>
                  <p className="truncate text-sm text-muted">@{entry.profile.username}</p>
                </div>
                <FriendActions friendshipId={entry.friendshipId} kind="outgoing" />
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Friends ({graph.accepted.length})
        </h2>
        {graph.accepted.length === 0 ? (
          <EmptyState
            title="No friends yet"
            hint="Ask a gym buddy for their username and send a request."
          />
        ) : (
          <div className="space-y-2">
            {graph.accepted.map((entry) => (
              <Card key={entry.friendshipId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.profile.display_name}</p>
                  <p className="truncate text-sm text-muted">@{entry.profile.username}</p>
                </div>
                <FriendActions friendshipId={entry.friendshipId} kind="accepted" />
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
