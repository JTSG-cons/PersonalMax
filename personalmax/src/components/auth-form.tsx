"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, ErrorNote, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/icons";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    if (mode === "signup") {
      body.username = String(form.get("username") ?? "");
      const displayName = String(form.get("displayName") ?? "").trim();
      if (displayName) body.displayName = displayName;
    }

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong");
        return;
      }
      if (mode === "signup" && data.needsEmailConfirmation) {
        setNotice("Check your email to confirm your account, then log in.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-bold">
        <Icon name="dumbbell" className="h-6 w-6 text-accent" />
        PersonalMax
      </Link>

      <div className="rounded-2xl border border-edge bg-surface p-6">
        <h1 className="text-xl font-bold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login"
            ? "Log in to keep the streak alive."
            : "Your character is waiting to be forged."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <>
              <Field label="Username" hint="3–20 letters, numbers, or underscores">
                <input
                  name="username"
                  required
                  pattern="[A-Za-z0-9_]{3,20}"
                  autoComplete="username"
                  className={inputClass}
                  placeholder="ironlifter"
                />
              </Field>
              <Field label="Display name (optional)">
                <input
                  name="displayName"
                  maxLength={40}
                  autoComplete="name"
                  className={inputClass}
                  placeholder="How friends see you"
                />
              </Field>
            </>
          ) : null}

          <Field label="Email">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
            <input
              name="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : 1}
              maxLength={72}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={inputClass}
              placeholder="••••••••"
            />
          </Field>

          <ErrorNote message={error} />
          {notice ? (
            <p className="rounded-xl border border-win/40 bg-win/10 px-3.5 py-2.5 text-sm text-win">
              {notice}
            </p>
          ) : null}

          <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full`}>
            {pending ? "One moment…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-accent-soft hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent-soft hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
