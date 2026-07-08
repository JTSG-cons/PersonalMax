"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, ErrorNote, Field, inputClass } from "@/components/ui";

interface TargetInitial {
  bodyweightKg: string;
  heightCm: string;
  age: string;
  sex: string;
  goal: string;
}

export function TargetGeneratorForm({ initial }: { initial: TargetInitial | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const age = String(form.get("age") ?? "").trim();
    const sex = String(form.get("sex") ?? "");

    try {
      const res = await fetch("/api/nutrition/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyweightKg: Number(form.get("bodyweightKg")),
          heightCm: Number(form.get("heightCm")),
          age: age === "" ? null : Number(age),
          sex: sex === "" ? null : sex,
          goal: form.get("goal"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Failed to compute target");
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
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Bodyweight (kg)">
        <input
          name="bodyweightKg"
          type="number"
          required
          min={30}
          max={400}
          step="0.1"
          defaultValue={initial?.bodyweightKg}
          className={inputClass}
        />
      </Field>
      <Field label="Height (cm)">
        <input
          name="heightCm"
          type="number"
          required
          min={100}
          max={250}
          step="0.1"
          defaultValue={initial?.heightCm}
          className={inputClass}
        />
      </Field>
      <Field label="Age (optional)" hint="Defaults to 30">
        <input
          name="age"
          type="number"
          min={13}
          max={100}
          defaultValue={initial?.age}
          className={inputClass}
          placeholder="30"
        />
      </Field>
      <Field label="Biological sex (optional)" hint="Only tunes the calorie formula">
        <select name="sex" defaultValue={initial?.sex ?? ""} className={inputClass}>
          <option value="">Skip / use average</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </Field>
      <Field label="Goal">
        <select name="goal" defaultValue={initial?.goal ?? "maintain"} className={inputClass}>
          <option value="cut">Cut</option>
          <option value="maintain">Maintain</option>
          <option value="bulk">Bulk</option>
        </select>
      </Field>

      <div className="sm:col-span-2 lg:col-span-5">
        <ErrorNote message={error} />
        <button type="submit" disabled={pending} className={`${buttonClass.primary} mt-1`}>
          {pending ? "Computing…" : "Compute target"}
        </button>
      </div>
    </form>
  );
}

export function MealLogForm({ today }: { today: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"),
          calories: Number(fields.get("calories") || 0),
          proteinG: Number(fields.get("proteinG") || 0),
          carbsG: Number(fields.get("carbsG") || 0),
          fatG: Number(fields.get("fatG") || 0),
          eatenOn: today,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Failed to log meal");
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
      <input
        name="name"
        required
        maxLength={120}
        placeholder="Chicken & rice"
        className={inputClass}
      />
      <input name="calories" type="number" required min={0} max={10000} placeholder="kcal" className={inputClass} />
      <input name="proteinG" type="number" min={0} max={1000} placeholder="P (g)" className={inputClass} />
      <input name="carbsG" type="number" min={0} max={1000} placeholder="C (g)" className={inputClass} />
      <input name="fatG" type="number" min={0} max={1000} placeholder="F (g)" className={inputClass} />
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "…" : "Log"}
      </button>
      <div className="sm:col-span-6">
        <ErrorNote message={error} />
      </div>
    </form>
  );
}

export function MealRowActions({ mealId }: { mealId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    try {
      await fetch(`/api/meals/${mealId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="text-sm text-muted transition hover:text-danger disabled:opacity-40"
      aria-label="Delete meal"
    >
      ✕
    </button>
  );
}
