"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, ErrorNote, inputClass } from "@/components/ui";

export function RenameForm({ current }: { current: string }) {
  const router = useRouter();
  const [name, setName] = useState(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/character/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Failed to rename");
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
    <form onSubmit={onSubmit} className="flex flex-wrap gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={30}
        required
        className={`${inputClass} max-w-xs`}
      />
      <button
        type="submit"
        disabled={pending || name.trim() === current}
        className={buttonClass.secondary}
      >
        {pending ? "Saving…" : "Rename"}
      </button>
      <div className="w-full">
        <ErrorNote message={error} />
      </div>
    </form>
  );
}
