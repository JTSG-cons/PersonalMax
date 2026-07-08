import type { Metadata } from "next";
import { Card, PageTitle, XpBar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import type { CharacterRow, KingdomTierRow } from "@/lib/types";

export const metadata: Metadata = { title: "Kingdom" };

// Level-gated cosmetic progression: tiers unlock as the character levels up.
export default async function KingdomPage() {
  const supabase = await createClient();

  const [{ data: characterData }, { data: tierData }] = await Promise.all([
    supabase.from("characters").select("*").maybeSingle(),
    supabase.from("kingdom_tiers").select("*").order("tier", { ascending: true }),
  ]);

  const character = characterData as CharacterRow | null;
  const tiers = (tierData ?? []) as KingdomTierRow[];
  const level = character?.level ?? 1;

  const current = [...tiers].reverse().find((t) => level >= t.min_level) ?? tiers[0];
  const next = tiers.find((t) => t.min_level > level) ?? null;

  return (
    <>
      <PageTitle
        title="Kingdom"
        subtitle="Your domain grows as you level. Train, fuel, conquer."
      />

      {current ? (
        <Card className="mb-6 overflow-hidden">
          <div
            className="relative -m-4 mb-4 p-6 sm:-m-5 sm:mb-5 sm:p-8"
            style={{
              background: `linear-gradient(135deg, ${current.accent}26, transparent 65%)`,
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 bg-bg/60"
                style={{ borderColor: current.accent, color: current.accent }}
              >
                <Icon name="crown" className="h-10 w-10" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Tier {current.tier} of {tiers.length}
                </p>
                <h2 className="text-3xl font-black" style={{ color: current.accent }}>
                  {current.title}
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted">{current.description}</p>
              </div>
            </div>
          </div>

          {next ? (
            <XpBar
              value={level - current.min_level}
              max={next.min_level - current.min_level}
              label={`Level ${level} — reach level ${next.min_level} to unlock ${next.title}`}
            />
          ) : (
            <p className="text-sm font-semibold text-gold">
              Maximum tier reached. The known world is yours.
            </p>
          )}
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {tiers.map((tier) => {
          const unlocked = level >= tier.min_level;
          return (
            <Card
              key={tier.tier}
              className={unlocked ? "" : "opacity-50 grayscale"}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                  style={
                    unlocked
                      ? { borderColor: tier.accent, color: tier.accent }
                      : { borderColor: "var(--color-edge)", color: "var(--color-muted)" }
                  }
                >
                  <Icon name={unlocked ? "crown" : "shield"} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-semibold">{tier.title}</h3>
                    <span className="text-xs text-muted">
                      {unlocked ? "Unlocked" : `Level ${tier.min_level}`}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted">{tier.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
