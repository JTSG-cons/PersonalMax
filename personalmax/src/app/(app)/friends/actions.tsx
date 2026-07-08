"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, ErrorNote, inputClass } from "@/components/ui";

export function AddFriendForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const username = String(new FormData(form).get("username") ?? "");
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to send request");
        return;
      }
      setSuccess(`Request sent to @${username}`);
      form.reset();
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
        name="username"
        required
        pattern="[A-Za-z0-9_]{3,20}"
        placeholder="Exact username, e.g. ironlifter"
        className={`${inputClass} max-w-xs`}
      />
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Sending…" : "Send request"}
      </button>
      <div className="w-full">
        <ErrorNote message={error} />
        {success ? <p className="text-sm text-win">{success}</p> : null}
      </div>
    </form>
  );
}

export function FriendActions({
  friendshipId,
  kind,
}: {
  friendshipId: string;
  kind: "incoming" | "outgoing" | "accepted";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function act(action: "accept" | "reject" | "remove") {
    if (action === "remove" && !window.confirm("Remove this friend?")) return;
    setPending(true);
    try {
      await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (kind === "incoming") {
    return (
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => act("accept")}
          disabled={pending}
          className={buttonClass.primary}
        >
          Accept
        </button>
        <button
          onClick={() => act("reject")}
          disabled={pending}
          className={buttonClass.secondary}
        >
          Reject
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => act(kind === "outgoing" ? "reject" : "remove")}
      disabled={pending}
      className={`${buttonClass.danger} shrink-0`}
    >
      {kind === "outgoing" ? "Cancel" : "Remove"}
    </button>
  );
}
