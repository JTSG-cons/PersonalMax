import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { Icon } from "@/components/icons";

const FEATURES = [
  { icon: "dumbbell", title: "Track every session", text: "Exercises, sets, reps, and load — logged in seconds." },
  { icon: "calendar", title: "Plans that fit you", text: "Deterministic weekly programs for your split, goal, and schedule." },
  { icon: "utensils", title: "Fuel with intent", text: "A daily calorie and macro target, plus fast manual meal logging." },
  { icon: "shield", title: "Level a real hero", text: "Stats forged from your actual training — no shortcuts, no cheats." },
  { icon: "crown", title: "Grow your kingdom", text: "New tiers unlock as you level, from campsite to empire." },
  { icon: "swords", title: "Battle your friends", text: "Async stat duels, a friends leaderboard, and awards to chase." },
] as const;

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Icon name="dumbbell" className="h-6 w-6 text-accent" />
          PersonalMax
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonClass.ghost}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClass.primary}>
            Get started
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="mb-3 rounded-full border border-edge bg-surface px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent-soft">
          Train · Fuel · Level up
        </p>
        <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
          Your workouts build more than muscle.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Every set you log and meal you track levels a character, grows a
          kingdom, and powers you up for battles against your friends.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className={buttonClass.primary}>
            Create your character
          </Link>
          <Link href="/login" className={buttonClass.secondary}>
            I have an account
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-edge bg-surface p-5">
            <Icon name={f.icon} className="h-6 w-6 text-accent" />
            <h2 className="mt-3 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
