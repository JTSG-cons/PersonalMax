import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageTitle, XpBar } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { levelProgress } from "@/lib/engine/leveling";
import { tierForLevel } from "@/lib/engine/kingdom";
import { createClient } from "@/lib/supabase/server";
import type { CharacterRow } from "@/lib/types";
import { RenameForm } from "./rename";

export const metadata: Metadata = { title: "Character" };

const STATS: { key: keyof CharacterRow; label: string; icon: IconName; blurb: string }[] = [
  { key: "strength", label: "Strength", icon: "dumbbell", blurb: "Total load lifted" },
  { key: "endurance", label: "Endurance", icon: "flame", blurb: "Time and reps in the tank" },
  { key: "discipline", label: "Discipline", icon: "calendar", blurb: "Consistency and streaks" },
  { key: "vitality", label: "Vitality", icon: "utensils", blurb: "Fuel and adherence" },
];

export default async function CharacterPage() {
  const supabase = await createClient();

  // Recompute is server-authoritative and idempotent: the SECURITY DEFINER
  // function re-derives everything from logged history and returns the row.
  const { data } = await supabase.rpc("rpc_recompute_my_progress");
  const character = (Array.isArray(data) ? data[0] : data) as CharacterRow | null;

  if (!character) {
    return (
      <>
        <PageTitle title="Character" />
        <p className="text-sm text-muted">
          Your character hasn&apos;t been forged yet — try reloading.
        </p>
      </>
    );
  }

  const progress = levelProgress(character.xp);
  const tier = tierForLevel(character.level);

  return (
    <>
      <PageTitle
        title="Character"
        subtitle="Every number on this sheet is computed from your real logs."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl border-2"
              style={{ borderColor: tier.accent, color: tier.accent }}
            >
              <Icon name="shield" className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{character.name}</h2>
              <p className="text-sm text-muted">
                Level {character.level} · {tier.title}{" "}
                <Link href="/kingdom" className="text-accent-soft hover:underline">
                  view kingdom
                </Link>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gold">
              {character.xp.toLocaleString()} XP
            </p>
            <p className="text-xs text-muted">
              {character.battles_won}W / {character.battles_fought - character.battles_won}L in battles
            </p>
          </div>
        </div>

        <div className="mt-5">
          <XpBar
            value={progress.intoLevel}
            max={progress.forNext}
            label={`${progress.intoLevel.toLocaleString()} / ${progress.forNext.toLocaleString()} XP to level ${character.level + 1}`}
          />
        </div>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        {STATS.map((stat) => (
          <Card key={stat.key}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name={stat.icon} className="h-6 w-6 text-accent" />
                <div>
                  <p className="font-semibold">{stat.label}</p>
                  <p className="text-xs text-muted">{stat.blurb}</p>
                </div>
              </div>
              <span className="text-3xl font-black text-accent-soft">
                {character[stat.key] as number}
              </span>
            </div>
            <div className="mt-3">
              <XpBar value={character[stat.key] as number} max={99} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Rename your hero</h3>
        <RenameForm current={character.name} />
        <p className="mt-4 text-xs text-muted">
          How stats are computed: strength grows with lifetime volume, endurance
          with training time and reps, discipline with active days and streaks,
          vitality with meal logging and hitting your calorie target. See{" "}
          <span className="font-mono">docs/FORMULAS.md</span> in the repo for exact math.
        </p>
      </Card>
    </>
  );
}
