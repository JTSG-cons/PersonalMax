import type { SupabaseClient } from "@supabase/supabase-js";
import type { FriendshipRow, ProfileRow } from "@/lib/types";

export interface FriendEntry {
  friendshipId: string;
  profile: ProfileRow;
}

export interface SocialGraph {
  accepted: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  acceptedIds: string[];
}

// Loads the caller's friendships (RLS returns only rows they participate in)
// plus the counterpart profiles (RLS: visible because they're connected).
export async function loadSocialGraph(
  supabase: SupabaseClient,
  userId: string,
): Promise<SocialGraph> {
  const { data: friendshipData } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .order("created_at", { ascending: false });

  const friendships = (friendshipData ?? []) as FriendshipRow[];
  const otherIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id,
  );

  const profiles = new Map<string, ProfileRow>();
  if (otherIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", otherIds);
    for (const p of (profileData ?? []) as ProfileRow[]) profiles.set(p.id, p);
  }

  const entry = (f: FriendshipRow): FriendEntry | null => {
    const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
    const profile = profiles.get(otherId);
    return profile ? { friendshipId: f.id, profile } : null;
  };

  const accepted = friendships
    .filter((f) => f.status === "accepted")
    .map(entry)
    .filter((e): e is FriendEntry => e !== null);
  const incoming = friendships
    .filter((f) => f.status === "pending" && f.addressee_id === userId)
    .map(entry)
    .filter((e): e is FriendEntry => e !== null);
  const outgoing = friendships
    .filter((f) => f.status === "pending" && f.requester_id === userId)
    .map(entry)
    .filter((e): e is FriendEntry => e !== null);

  return {
    accepted,
    incoming,
    outgoing,
    acceptedIds: accepted.map((e) => e.profile.id),
  };
}
