"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, ErrorNote, Field, inputClass } from "@/components/ui";

export function PlanGeneratorForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/plans/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: form.get("goal"),
          experience: form.get("experience"),
          daysPerWeek: Number(form.get("daysPerWeek")),
          splitType: form.get("splitType"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Failed to generate plan");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Goal">
        <select name="goal" defaultValue="hypertrophy" className={inputClass}>
          <option value="strength">Strength</option>
          <option value="hypertrophy">Hypertrophy</option>
          <option value="endurance">Endurance</option>
          <option value="general">General fitness</option>
        </select>
      </Field>
      <Field label="Experience">
        <select name="experience" defaultValue="beginner" className={inputClass}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </Field>
      <Field label="Days per week">
        <select name="daysPerWeek" defaultValue="4" className={inputClass}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Split">
        <select name="splitType" defaultValue="upper_lower" className={inputClass}>
          <option value="full_body">Full Body</option>
          <option value="upper_lower">Upper/Lower</option>
          <option value="push_pull_legs">Push/Pull/Legs</option>
          <option value="bro_split">Bro Split</option>
        </select>
      </Field>

      <div className="sm:col-span-2 lg:col-span-4">
        <ErrorNote message={error} />
        <button type="submit" disabled={pending} className={`${buttonClass.primary} mt-2`}>
          {pending ? "Generating…" : "Generate plan"}
        </button>
      </div>
    </form>
  );
}
