"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, Card, ErrorNote, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/icons";

interface SetDraft {
  reps: string;
  weightKg: string;
  durationSeconds: string;
}

interface ExerciseDraft {
  name: string;
  notes: string;
  sets: SetDraft[];
}

export interface WorkoutDraft {
  title: string;
  notes: string;
  performedAt: string; // datetime-local value
  durationMinutes: string;
  exercises: ExerciseDraft[];
}

const emptySet = (): SetDraft => ({ reps: "8", weightKg: "0", durationSeconds: "" });
const emptyExercise = (): ExerciseDraft => ({ name: "", notes: "", sets: [emptySet()] });

export function defaultDraft(): WorkoutDraft {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return {
    title: "",
    notes: "",
    performedAt: now.toISOString().slice(0, 16),
    durationMinutes: "60",
    exercises: [emptyExercise()],
  };
}

export function WorkoutEditor({
  mode,
  sessionId,
  initial,
}: {
  mode: "create" | "edit";
  sessionId?: string;
  initial: WorkoutDraft;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkoutDraft>(initial);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateExercise(i: number, patch: Partial<ExerciseDraft>) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)),
    }));
  }

  function updateSet(i: number, j: number, patch: Partial<SetDraft>) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex, idx) =>
        idx === i
          ? { ...ex, sets: ex.sets.map((s, sIdx) => (sIdx === j ? { ...s, ...patch } : s)) }
          : ex,
      ),
    }));
  }

  async function submit() {
    setPending(true);
    setError(null);

    const body = {
      title: draft.title,
      notes: draft.notes,
      performedAt: new Date(draft.performedAt).toISOString(),
      durationMinutes: draft.durationMinutes === "" ? null : Number(draft.durationMinutes),
      exercises: draft.exercises.map((ex) => ({
        name: ex.name,
        notes: ex.notes,
        sets: ex.sets.map((s) => ({
          reps: Number(s.reps || 0),
          weightKg: Number(s.weightKg || 0),
          durationSeconds: s.durationSeconds === "" ? null : Number(s.durationSeconds),
        })),
      })),
    };

    try {
      const res = await fetch(
        mode === "create" ? "/api/workouts" : `/api/workouts/${sessionId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save workout");
        return;
      }
      router.push("/workouts");
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!sessionId) return;
    if (!window.confirm("Delete this workout session? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/workouts/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Failed to delete");
        return;
      }
      router.push("/workouts");
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <input
              className={inputClass}
              value={draft.title}
              maxLength={80}
              placeholder="Push day, 5k row, leg day…"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Field label="Date & time">
            <input
              type="datetime-local"
              className={inputClass}
              value={draft.performedAt}
              onChange={(e) => setDraft({ ...draft, performedAt: e.target.value })}
            />
          </Field>
          <Field label="Duration (minutes)">
            <input
              type="number"
              min={0}
              max={1440}
              className={inputClass}
              value={draft.durationMinutes}
              onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <input
              className={inputClass}
              value={draft.notes}
              maxLength={1000}
              placeholder="How did it go?"
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      {draft.exercises.map((exercise, i) => (
        <Card key={i}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <input
              className={inputClass}
              value={exercise.name}
              maxLength={80}
              placeholder={`Exercise ${i + 1} — e.g. Barbell Bench Press`}
              onChange={(e) => updateExercise(i, { name: e.target.value })}
            />
            <button
              type="button"
              aria-label="Remove exercise"
              disabled={draft.exercises.length === 1}
              className={buttonClass.ghost}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  exercises: d.exercises.filter((_, idx) => idx !== i),
                }))
              }
            >
              Remove
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr_4rem] items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <span>Set</span>
              <span>Reps</span>
              <span>Weight (kg)</span>
              <span>Time (s, optional)</span>
              <span />
            </div>
            {exercise.sets.map((set, j) => (
              <div
                key={j}
                className="grid grid-cols-[2rem_1fr_1fr_1fr_4rem] items-center gap-2"
              >
                <span className="text-sm font-semibold text-muted">{j + 1}</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  className={inputClass}
                  value={set.reps}
                  onChange={(e) => updateSet(i, j, { reps: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  max={2000}
                  step="0.5"
                  className={inputClass}
                  value={set.weightKg}
                  onChange={(e) => updateSet(i, j, { weightKg: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  max={86400}
                  className={inputClass}
                  value={set.durationSeconds}
                  placeholder="—"
                  onChange={(e) => updateSet(i, j, { durationSeconds: e.target.value })}
                />
                <button
                  type="button"
                  disabled={exercise.sets.length === 1}
                  className="justify-self-end text-sm text-muted transition hover:text-danger disabled:opacity-40"
                  onClick={() =>
                    updateExercise(i, { sets: exercise.sets.filter((_, sIdx) => sIdx !== j) })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={`${buttonClass.ghost} mt-3`}
            onClick={() =>
              updateExercise(i, {
                sets: [...exercise.sets, { ...exercise.sets[exercise.sets.length - 1] }],
              })
            }
          >
            <Icon name="plus" className="h-4 w-4" /> Add set
          </button>
        </Card>
      ))}

      <button
        type="button"
        className={buttonClass.secondary}
        disabled={draft.exercises.length >= 20}
        onClick={() =>
          setDraft((d) => ({ ...d, exercises: [...d.exercises, emptyExercise()] }))
        }
      >
        <Icon name="plus" className="h-4 w-4" /> Add exercise
      </button>

      <ErrorNote message={error} />

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || deleting}
          className={buttonClass.primary}
        >
          {pending ? "Saving…" : mode === "create" ? "Log workout" : "Save changes"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending || deleting}
            className={buttonClass.danger}
          >
            {deleting ? "Deleting…" : "Delete session"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
