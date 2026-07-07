"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, ErrorNote, inputClass } from "@/components/ui";
import type { BattleRow } from "@/lib/types";

export function ChallengeForm({
  friends,
}: {
  friends: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ won: boolean; battle: BattleRow } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    const opponentId = String(new FormData(event.currentTarget).get("opponentId") ?? "");
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Battle failed");
        return;
      }
      const battle = data.battle as BattleRow;
      setResult({ won: battle.winner_id === battle.challenger_id, battle });
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-3">
        <select name="opponentId" required className={`${inputClass} max-w-xs`}>
          {friends.map((friend) => (
            <option key={friend.id} value={friend.id}>
              {friend.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Fighting…" : "Battle!"}
        </button>
      </form>

      <ErrorNote message={error} />

      {result ? (
        <div
          role="status"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
            result.won
              ? "border-win/40 bg-win/10 text-win"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {result.won
            ? `Victory! ${Number(result.battle.challenger_score).toFixed(2)} vs ${Number(result.battle.opponent_score).toFixed(2)} — +${result.battle.xp_awarded} XP`
            : `Defeat. ${Number(result.battle.challenger_score).toFixed(2)} vs ${Number(result.battle.opponent_score).toFixed(2)} — train and try again`}
        </div>
      ) : null}
    </div>
  );
}
