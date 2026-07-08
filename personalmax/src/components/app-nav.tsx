"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const NAV: { href: string; label: string; icon: IconName; mobile?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", mobile: true },
  { href: "/workouts", label: "Workouts", icon: "dumbbell", mobile: true },
  { href: "/plan", label: "Training plan", icon: "calendar" },
  { href: "/nutrition", label: "Nutrition", icon: "utensils", mobile: true },
  { href: "/character", label: "Character", icon: "shield", mobile: true },
  { href: "/kingdom", label: "Kingdom", icon: "crown" },
  { href: "/awards", label: "Awards", icon: "trophy" },
  { href: "/friends", label: "Friends", icon: "users" },
  { href: "/leaderboard", label: "Leaderboard", icon: "chart" },
  { href: "/battles", label: "Battles", icon: "swords", mobile: true },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className={`text-sm font-medium text-muted transition hover:text-ink ${className}`}
    >
      Sign out
    </button>
  );
}

export function Sidebar({ username }: { username: string }) {
  const isActive = useIsActive();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-edge bg-surface/60 px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2 text-lg font-bold">
        <Icon name="dumbbell" className="h-6 w-6 text-accent" />
        PersonalMax
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive(item.href)
                ? "bg-accent/15 text-accent-soft"
                : "text-muted hover:bg-raised hover:text-ink"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-edge px-3 pt-4">
        <p className="truncate text-sm font-semibold">@{username}</p>
        <SignOutButton className="mt-1" />
      </div>
    </aside>
  );
}

export function MobileTopBar({ username }: { username: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-edge bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2 font-bold">
        <Icon name="dumbbell" className="h-5 w-5 text-accent" />
        PersonalMax
      </Link>
      <div className="flex items-center gap-3">
        <span className="max-w-32 truncate text-xs text-muted">@{username}</span>
        <SignOutButton />
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const isActive = useIsActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {NAV.filter((item) => item.mobile).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
              isActive(item.href) ? "text-accent-soft" : "text-muted"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label.split(" ")[0]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
